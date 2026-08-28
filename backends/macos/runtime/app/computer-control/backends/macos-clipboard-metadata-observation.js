"use strict";

const cp=require("node:child_process");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");

const SOURCE=path.resolve(__dirname,"..","..","..","tools","macos-clipboard-metadata-observation.swift");
const BINARY=path.join(os.tmpdir(),"rumiai-computer-control","rumiai-macos-clipboard-metadata-observation");
const METHOD="macos-native-clipboard-metadata-observation";

function run(cmd,args){const started=performance.now();const result=cp.spawnSync(cmd,args,{encoding:"utf8",maxBuffer:32*1024*1024});return{ok:(result.status??1)===0,code:result.status??1,stdout:result.stdout||"",stderr:result.stderr||"",seconds:(performance.now()-started)/1000,method:`${cmd} ${args.join(" ")}`};}
function needsCompile(){if(!fs.existsSync(BINARY))return true;try{return fs.statSync(SOURCE).mtimeMs>fs.statSync(BINARY).mtimeMs;}catch{return true;}}
function ensureHelper(){if(!fs.existsSync(SOURCE))return{ok:false,error:"CLIPBOARD_METADATA_OBSERVER_SOURCE_MISSING",detail:`missing helper source: ${SOURCE}`,seconds:0};if(!needsCompile())return{ok:true,path:BINARY,compiled:false,seconds:0};const which=run("/usr/bin/xcrun",["--find","swiftc"]);if(!which.ok)return{ok:false,error:"CLIPBOARD_METADATA_OBSERVER_UNAVAILABLE",detail:(which.stderr||which.stdout||"swiftc unavailable").trim(),seconds:which.seconds};fs.mkdirSync(path.dirname(BINARY),{recursive:true});const compiled=run("/usr/bin/xcrun",["swiftc",SOURCE,"-o",BINARY,"-framework","AppKit"]);if(!compiled.ok)return{ok:false,error:"CLIPBOARD_METADATA_OBSERVER_COMPILE_FAILED",detail:(compiled.stderr||compiled.stdout||"clipboard metadata helper compilation failed").trim(),seconds:which.seconds+compiled.seconds};try{fs.chmodSync(BINARY,0o755);}catch{}return{ok:true,path:BINARY,compiled:true,seconds:which.seconds+compiled.seconds};}
function observe(){const helper=ensureHelper();if(!helper.ok)return{...helper,state:"FAILED",revision:null,items:[],method:METHOD};const executed=run(helper.path,[]);const seconds=(helper.seconds||0)+(executed.seconds||0);let data=null;try{data=JSON.parse(String(executed.stdout||"").trim());}catch(error){return{ok:false,state:"FAILED",error:"CLIPBOARD_METADATA_OBSERVATION_INVALID_JSON",detail:`invalid native clipboard metadata JSON: ${error.message}; stderr=${String(executed.stderr||"").trim()}`,revision:null,items:[],seconds,method:METHOD};}if(!executed.ok||data?.ok!==true)return{ok:false,state:data?.state||"FAILED",error:data?.error||"CLIPBOARD_METADATA_OBSERVATION_FAILED",detail:data?.detail||String(executed.stderr||executed.stdout||"native clipboard metadata observation failed").trim(),revision:null,items:[],seconds,method:data?.method||METHOD,compiled:helper.compiled===true};return{ok:true,state:"OBSERVED",revision:data.revision,items:Array.isArray(data.items)?data.items:[],seconds,method:data.method||METHOD,compiled:helper.compiled===true};}

module.exports={SOURCE,BINARY,METHOD,ensureHelper,observe};
