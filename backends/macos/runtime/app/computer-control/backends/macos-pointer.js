"use strict";
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {spawnSync}=require("node:child_process");

const HELPER=path.resolve(__dirname,"../../../tools/macos-pointer.swift");
let cachedBinary=null;

function compile(){
  if(cachedBinary&&fs.existsSync(cachedBinary))return{ok:true,path:cachedBinary,compiled:false};
  const binary=path.join(os.tmpdir(),"rumiai-macos-pointer");
  const result=spawnSync("/usr/bin/xcrun",["swiftc","-parse-as-library",HELPER,"-o",binary,"-framework","ApplicationServices","-framework","CoreGraphics"],{encoding:"utf8",maxBuffer:8*1024*1024});
  if((result.status??1)!==0)return{ok:false,state:"BLOCKED",error:"POINTER_HELPER_COMPILE_FAILED",detail:String(result.stderr||result.stdout||"Swift helper compilation failed").trim()};
  cachedBinary=binary;
  return{ok:true,path:binary,compiled:true};
}

function invoke(request){
  if(process.platform!=="darwin")return{ok:false,state:"BLOCKED",error:"POINTER_MACOS_REQUIRED",detail:"Pointer fallback requires macOS"};
  const compiled=compile();
  if(!compiled.ok)return compiled;
  const started=process.hrtime.bigint();
  const result=spawnSync(compiled.path,[],{input:JSON.stringify(request),encoding:"utf8",maxBuffer:1024*1024,timeout:10000});
  const seconds=Number(process.hrtime.bigint()-started)/1e9;
  if(result.error)return{ok:false,state:"FAILED",error:"POINTER_HELPER_FAILED",detail:String(result.error.message||"Pointer helper failed"),seconds,compiled:compiled.compiled};
  let value;
  try{value=JSON.parse(String(result.stdout||"").trim());}
  catch{return{ok:false,state:"FAILED",error:"POINTER_INVALID_NATIVE_RESPONSE",detail:"Pointer helper returned invalid JSON",seconds,compiled:compiled.compiled};}
  if((result.status??1)!==0||value?.ok!==true)return{...value,ok:false,state:value?.state||((result.status??1)===2?"BLOCKED":"FAILED"),seconds,compiled:compiled.compiled};
  return{...value,seconds,compiled:compiled.compiled};
}

const move=({display,x,y})=>invoke({operation:"move",display,x,y});
const click=({display,x,y,button})=>invoke({operation:"click",display,x,y,button});
module.exports={move,click};
