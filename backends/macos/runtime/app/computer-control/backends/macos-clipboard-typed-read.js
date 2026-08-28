"use strict";

const cp=require("node:child_process");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");

const SOURCE=path.resolve(__dirname,"..","..","..","tools","macos-clipboard-typed-read.swift");
const BINARY=path.join(os.tmpdir(),"rumiai-computer-control","rumiai-macos-clipboard-typed-read");
const METHOD="macos-native-clipboard-typed-read";
const MAX_PAYLOAD_BYTES=16*1024*1024;

function run(cmd,args){const started=performance.now();const result=cp.spawnSync(cmd,args,{encoding:"utf8",maxBuffer:32*1024*1024});return{ok:(result.status??1)===0,code:result.status??1,stdout:result.stdout||"",stderr:result.stderr||"",seconds:(performance.now()-started)/1000,method:`${cmd} ${args.join(" ")}`};}
function needsCompile(){if(!fs.existsSync(BINARY))return true;try{return fs.statSync(SOURCE).mtimeMs>fs.statSync(BINARY).mtimeMs;}catch{return true;}}
function ensureHelper(){if(!fs.existsSync(SOURCE))return{ok:false,error:"CLIPBOARD_TYPED_READ_SOURCE_MISSING",detail:`missing helper source: ${SOURCE}`,seconds:0};if(!needsCompile())return{ok:true,path:BINARY,compiled:false,seconds:0};const which=run("/usr/bin/xcrun",["--find","swiftc"]);if(!which.ok)return{ok:false,error:"CLIPBOARD_TYPED_READ_UNAVAILABLE",detail:(which.stderr||which.stdout||"swiftc unavailable").trim(),seconds:which.seconds};fs.mkdirSync(path.dirname(BINARY),{recursive:true});const compiled=run("/usr/bin/xcrun",["swiftc",SOURCE,"-o",BINARY,"-framework","AppKit"]);if(!compiled.ok)return{ok:false,error:"CLIPBOARD_TYPED_READ_COMPILE_FAILED",detail:(compiled.stderr||compiled.stdout||"typed clipboard helper compilation failed").trim(),seconds:which.seconds+compiled.seconds};try{fs.chmodSync(BINARY,0o755);}catch{}return{ok:true,path:BINARY,compiled:true,seconds:which.seconds+compiled.seconds};}
function read({revision,itemIndex,format}){const helper=ensureHelper();if(!helper.ok)return{...helper,state:"FAILED",method:METHOD};const executed=run(helper.path,[String(revision),String(itemIndex),String(format),String(MAX_PAYLOAD_BYTES)]);const seconds=(helper.seconds||0)+(executed.seconds||0);let data=null;try{data=JSON.parse(String(executed.stdout||"").trim());}catch(error){return{ok:false,state:"FAILED",error:"CLIPBOARD_TYPED_READ_INVALID_JSON",detail:`invalid native typed clipboard JSON: ${error.message}; stderr=${String(executed.stderr||"").trim()}`,seconds,method:METHOD};}if(!executed.ok||data?.ok!==true)return{ok:false,state:data?.state||"FAILED",error:data?.error||"CLIPBOARD_TYPED_READ_FAILED",detail:data?.detail||String(executed.stderr||executed.stdout||"native typed clipboard read failed").trim(),seconds,method:data?.method||METHOD,compiled:helper.compiled===true};return{ok:true,state:"READ",revision:data.revision,itemIndex:data.itemIndex,format:data.format,byteCount:data.byteCount,dataBase64:data.dataBase64,seconds,method:data.method||METHOD,compiled:helper.compiled===true};}

module.exports={SOURCE,BINARY,METHOD,MAX_PAYLOAD_BYTES,ensureHelper,read};
