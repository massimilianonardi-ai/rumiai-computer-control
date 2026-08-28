"use strict";
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {spawnSync}=require("node:child_process");

const HELPER=path.resolve(__dirname,"../../../tools/macos-display-capture.swift");
const MAX_CAPTURE_BYTES=20*1024*1024;
const MAX_BUFFER_BYTES=32*1024*1024;
let cachedBinary=null;

function compile(){
  if(cachedBinary&&fs.existsSync(cachedBinary))return{ok:true,path:cachedBinary,compiled:false};
  const binary=path.join(os.tmpdir(),"rumiai-macos-display-capture");
  const result=spawnSync("/usr/bin/xcrun",["swiftc",HELPER,"-o",binary,"-framework","AppKit","-framework","CoreGraphics","-framework","ScreenCaptureKit"],{encoding:"utf8",maxBuffer:8*1024*1024});
  if((result.status??1)!==0)return{ok:false,state:"BLOCKED",error:"DISPLAY_CAPTURE_HELPER_COMPILE_FAILED",detail:String(result.stderr||result.stdout||"Swift helper compilation failed").trim()};
  cachedBinary=binary;
  return{ok:true,path:binary,compiled:true};
}

function capture(){
  if(process.platform!=="darwin")return{ok:false,state:"BLOCKED",error:"DISPLAY_CAPTURE_MACOS_REQUIRED",detail:"display.capture requires macOS"};
  const compiled=compile();
  if(!compiled.ok)return compiled;
  const started=process.hrtime.bigint();
  const result=spawnSync(compiled.path,[],{encoding:"utf8",maxBuffer:MAX_BUFFER_BYTES,timeout:30000});
  const seconds=Number(process.hrtime.bigint()-started)/1e9;
  if(result.error){
    const code=result.error.code==="ENOBUFS"?"DISPLAY_CAPTURE_TRANSPORT_TOO_LARGE":"DISPLAY_CAPTURE_HELPER_FAILED";
    return{ok:false,state:"FAILED",error:code,detail:String(result.error.message||code),seconds,compiled:compiled.compiled};
  }
  let value;
  try{value=JSON.parse(String(result.stdout||"").trim());}
  catch{return{ok:false,state:"FAILED",error:"DISPLAY_CAPTURE_INVALID_NATIVE_RESPONSE",detail:"Display capture helper returned invalid JSON",seconds,compiled:compiled.compiled};}
  if((result.status??1)!==0||value?.ok!==true)return{...value,ok:false,state:value?.state||((result.status??1)===2?"BLOCKED":"FAILED"),seconds,compiled:compiled.compiled};
  return{...value,seconds,compiled:compiled.compiled};
}

module.exports={capture,MAX_CAPTURE_BYTES,MAX_BUFFER_BYTES};
