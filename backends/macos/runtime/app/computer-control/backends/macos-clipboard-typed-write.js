"use strict";

const cp=require("node:child_process");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");

const SOURCE=path.resolve(__dirname,"..","..","..","tools","macos-clipboard-typed-write.swift");
const BINARY=path.join(os.tmpdir(),"rumiai-computer-control","rumiai-macos-clipboard-typed-write");
const METHOD="macos-native-clipboard-typed-write";
const MAX_PAYLOAD_BYTES=16*1024*1024;
const MAX_TRANSPORT_BYTES=32*1024*1024;

function run(cmd,args,{input=null}={}){const started=performance.now();const result=cp.spawnSync(cmd,args,{encoding:"utf8",input,maxBuffer:MAX_TRANSPORT_BYTES});return{ok:(result.status??1)===0,code:result.status??1,stdout:result.stdout||"",stderr:result.stderr||"",seconds:(performance.now()-started)/1000,method:`${cmd} ${args.join(" ")}`};}
function needsCompile(){if(!fs.existsSync(BINARY))return true;try{return fs.statSync(SOURCE).mtimeMs>fs.statSync(BINARY).mtimeMs;}catch{return true;}}
function ensureHelper(){if(!fs.existsSync(SOURCE))return{ok:false,error:"CLIPBOARD_TYPED_WRITER_SOURCE_MISSING",detail:`missing helper source: ${SOURCE}`,seconds:0};if(!needsCompile())return{ok:true,path:BINARY,compiled:false,seconds:0};const which=run("/usr/bin/xcrun",["--find","swiftc"]);if(!which.ok)return{ok:false,error:"CLIPBOARD_TYPED_WRITER_UNAVAILABLE",detail:(which.stderr||which.stdout||"swiftc unavailable").trim(),seconds:which.seconds};fs.mkdirSync(path.dirname(BINARY),{recursive:true});const compiled=run("/usr/bin/xcrun",["swiftc",SOURCE,"-o",BINARY,"-framework","AppKit"]);if(!compiled.ok)return{ok:false,error:"CLIPBOARD_TYPED_WRITER_COMPILE_FAILED",detail:(compiled.stderr||compiled.stdout||"clipboard typed writer compilation failed").trim(),seconds:which.seconds+compiled.seconds};try{fs.chmodSync(BINARY,0o755);}catch{}return{ok:true,path:BINARY,compiled:true,seconds:which.seconds+compiled.seconds};}
function write({format,dataBase64}){const helper=ensureHelper();if(!helper.ok)return{...helper,state:"FAILED",revision:null,itemIndex:null,format:null,byteCount:null,method:METHOD};const payload=JSON.stringify({format,dataBase64});if(Buffer.byteLength(payload,"utf8")>MAX_TRANSPORT_BYTES)return{ok:false,state:"FAILED",error:"CLIPBOARD_TYPED_WRITE_TRANSPORT_TOO_LARGE",detail:"Typed clipboard request exceeds transport budget",revision:null,itemIndex:null,format:null,byteCount:null,seconds:helper.seconds||0,method:METHOD};const executed=run(helper.path,[],{input:payload});const seconds=(helper.seconds||0)+(executed.seconds||0);let data=null;try{data=JSON.parse(String(executed.stdout||"").trim());}catch(error){return{ok:false,state:"FAILED",error:"CLIPBOARD_TYPED_WRITE_INVALID_JSON",detail:`invalid native clipboard write JSON: ${error.message}; stderr=${String(executed.stderr||"").trim()}`,revision:null,itemIndex:null,format:null,byteCount:null,seconds,method:METHOD};}if(!executed.ok||data?.ok!==true)return{ok:false,state:data?.state||"FAILED",error:data?.error||"CLIPBOARD_TYPED_WRITE_FAILED",detail:data?.detail||String(executed.stderr||executed.stdout||"native clipboard typed write failed").trim(),revision:null,itemIndex:null,format:null,byteCount:null,seconds,method:data?.method||METHOD,compiled:helper.compiled===true};return{ok:true,state:"DELIVERED",revision:data.revision,itemIndex:data.itemIndex,format:data.format,byteCount:data.byteCount,seconds,method:data.method||METHOD,compiled:helper.compiled===true};}

module.exports={SOURCE,BINARY,METHOD,MAX_PAYLOAD_BYTES,MAX_TRANSPORT_BYTES,ensureHelper,write};
