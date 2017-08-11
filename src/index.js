var version = "5.0.0";
var fs = require("fs");
var path = require("path");
var parser = require("./parser");
var tmpl = require("./tmpl");

var rootns = rawcpt("rootns");
rootns.prop.rootns = rootns;
rootns.link.jsImpl = gc(rootns, "jsImpl", 0, 1);
rootns.link.init = gc(rootns, "init", 0, 1);
rootns.isroot = 1;
var tplcache = {};
var codecache = {};
var topersist= {};
module.exports = function(config, fn){
	console.log("#Disp version: "+ version);
	var cpt = bootstrap(config);
	var argarr = [];
	for(var i=1; i<process.argv.length; i++){
		argarr.push(raw2cpt(rootns, process.argv[i]));
	}
	var callcpt = newcall(rootns, cpt, argarr);
	callfunc(callcpt);
	archive();
}
/*
function gcp(parent, key){
	for(var pkey in parent){
		var cpt = gc(parent[pkey], key);
		if(cpt) return cpt;
	}
	return newcpt(hash, undefined, undefined, key);
}
*/
function gc(hash, key, limitf, newf){
	if(key in hash.prop){
		return hash.prop[key];
	}
	var f = __dirname + "/../"+ hash.path + "/" + key + ".mm";
	if(fs.existsSync(f)){
		var str = fs.readFileSync(f).toString();
		var ast = parse(str);
		cpt = analyze(hash, ast);
		sc(hash, key, cpt);
		return cpt;
	}
	if(limitf > 0){
		for(var p in hash.parent){
			var cpt = gc(hash.parent[p], key, limitf);
			if(cpt) return cpt;
		}
	}
	if(limitf > 1){
		for(var p in hash.link){
			var cpt = gc(hash.link[p], key, limitf-1);
			if(cpt) return cpt;
		}
	}
	if(newf)
		return newcpt(hash, undefined, undefined, key);
}
function sc(hash, key, cpt){
	if(!cpt){
		cpt = rawcpt(key);
	}
	hash.prop[key] = cpt;
	if(hash.name[0] != "$" && cpt.name[0] == "$"){
		var oldkey = cpt.name;
		cpt.name = key;
		cpt.path = hash.path + "/" + key;
		for(var keyp in cpt.parent){
			var p = cpt.parent[keyp];
			delete p.prop[oldkey];
		}
		repathprop(cpt);
	}
}
function repathprop(cpt){
	for(var keyp in cpt.prop){	
		var kcpt = cpt.prop[keyp];
		if(kcpt.name[0] != "$"){
			kcpt.path = cpt.path +"/"+kcpt.name;
			repathprop(kcpt);
		}
	}
}

function raw2cpt(ns, raw){
	if(typeof raw == "string")
		return newcpt(ns, raw, "String");
}
//value container
function getvcont(cpt){
	var pcpt = cpt;
	var ppcpt = cpt;
	while(1){
		if(isproto(pcpt, "dic")){
			return pcpt;
		}else if("value" in pcpt){
			ppcpt = pcpt;
			pcpt = pcpt.value;
		}else{
			return ppcpt;
		}
	}
}
function isproto(cpt, tarkey){
	for(var key in cpt.proto){
		if(tarkey == key) return 1;
		if(isparent(cpt.proto[key], tarkey))
			return 1;
	}
	return 0;
}
function isparent(cpt, tarkey){
	for(var key in cpt.parent){
		if(tarkey == key) return 1;
		if(isparent(cpt.parent[key], tarkey))
			return 1;
	}
	return 0;
}
function distance(){
}

function setparent(child, parent){
	child.parent[parent.name] = parent;
	//do statistics
}
function addproto(){
}
var asskey= {
	"proto": 1,
	"parent": 1,
	"link": 1,
	"prop": 1
}
function assign(left, right){
	for(var key1 in asskey)
		for(var key in right[key1])
			left[key1][key] = right[key1][key];
	topersist[left.path] = left;
}
function bootstrap(config){
//todo confi
//	var userns = newcpt(rootns, undefined, undefined, config.user);
	var ast = parse(config.code);
	var main = analyze(rootns, ast);
	sc(rootns, config.user, main);
	setproto(rootns, main, "Main");
	return main;//ast -> cpt
}
function setproto(ns, cpt, proto){
	cpt.proto[proto] = gc(ns, proto, 2, 1);
}
function parse(src){
	if(src == undefined || src == null) src = ";";
	return parser.parse(src);
}
function newcall(ns, fcpt, argarr){
	var cpt = newcpt(ns, undefined, "Call");
	sc(cpt, "function", fcpt);
	if(!argarr) argarr = [];
	var acpt = newcpt(cpt, argarr, "Arguments", "arguments");
	var at = gc(fcpt, "precall");
	if(at)
		callfunc(newcall(ns, at, argarr));
	return cpt;
}
function analyze(ns, ast){
	var c = ast[0];
	var e = ast[1];
	var cpt;
	switch(c){
		case "_newobj":
		cpt = newcpt(ns, [], ast[2]);
		setproto(rootns, cpt, "Array");
		for(var i in e){
			cpt.value.push(analyze(cpt, e[i]));
		}
		break;

		case "_phrase"://action
		var fcpt = analyze(ns, e[0]);
		if(isproto(fcpt, "Function") || isproto(fcpt, "Native")){
			var argarr = [];
			for(var i=1; i<e.length; i++){
					argarr.push(analyze(ns, e[i]));
			}
			cpt = newcall(ns, fcpt, argarr);
		}else{
			cpt = fcpt;
		}
		break;

		case "_id":
		if(e[0] == "$"){
			cpt = newcall(ns, gc(rootns, "get", 2, 1), [newcpt(ns, e, "String")]);
		}else{
			cpt = gc(ns, e, 2, 1);
		}
		break;

		case "_string":
		cpt = newcpt(ns, e, "String");
		break;

		case "_number":
		cpt = newcpt(ns, e, "Number");
		break;

		case "_native":
		cpt = newcpt(ns, e, "Native");
		break;

		case "_op":
		var left = analyze(ns, ast[2]);
		var right;
		if(ast[3]) right = analyze(ns, ast[3]);
		cpt = newcall(ns, gc(rootns, e, 2, 1), [left, right]);
		break;

		default:
		die(ast);
	}
	ast.cpt = cpt;
	return cpt;
}
function op(ns, op, left, right){
	switch(op){
		case "assign":
		left.value = right;
		break;
		case "extend":
		
		break;
		case "getkey":
		break;
		default: 
		console.log("unknown op "+op);
	}
}
function gen(tarcpt, configcpt){
	
//	console.log(archcpt);
//	console.log(cpt);
}
function archive(){
	for(var key in topersist){
		var cpt = topersist[key];
		
		console.log(cpt.path);
	}
}
function cpt2str(){
	
}
function extend(){
}
function callnative(cpt){
	var func = gc(cpt, "function");
	var v = func.value;
	var ns = {};
	var arg = gc(cpt, "arguments");
	var env = gc(cpt, "env");
	for(var key in arg.value){
		var a = arg.value[key];
		ns["$$"+key] = a;
		ns["$"+key] = a.value;
	}
	ns.$ = {
		assign: assign,
		gen: gen,
		gc: gc,
		env: env
	}
	ns.self = cpt;
	var result;
	try{
		with(ns){
			result = eval("(function(){"+v+"})()");
		}
	}catch(err){
		console.log(ns);
		console.log(v);
		die( "error");
	}
	if(result == undefined) result = "";
	cpt.proto.result = raw2cpt(cpt, result);
}

function callfunc(cpt){
	var func = gc(cpt, "function");
	if(!func){
		console.log(cpt);
		die("wrong call")
	}
	console.log("call " + cpt.name + " " + func.path);
	var arg = gc(cpt, "arguments");
	sc(cpt, "env");
	if(isproto(func, "Native") && typeof func.value == "string"){
		callnative(cpt);
		return cpt;
	}
	for(var i in func.value){
		var scpt = func.value[i];
		var tmpcpt = callfunc(scpt);
		if(isproto(tmpcpt, "Return")){
			sc(cpt, "result",  tmpcpt);
			break;
		}
	}
	if(!cpt.prop.result)
		sc(cpt, "result");
	return cpt;
}

function loadtpl(ns, name){
	var key = name + "/" + ns.outlang;

	if(ns.tplcache[key]) 
		return ns.tplcache[key];
	var got;
	for(var i in ns.searchpath){
		var sp = ns.searchpath[i];
		var f = __dirname + "/../" + sp + "/"+ key + ".t";
		if(fs.existsSync(f)){
			got = fs.readFileSync(f).toString();			
			break;
		}
	}
	ns.tplcache[key] = got;
	return got;
}
function rawcpt(name){
	var cpt = {
		name: name,
		path: name,
		proto: {},
		parent: {},
		prop: {},
		link: {},
		stat: {},
		nexti: 0
	}
	return cpt;
}
function newcpt(ns, value, protoname, name){
	if(!name){
		name = "$" + (protoname || "name") + (ns.nexti++);
	}
	var cpt = rawcpt(name);
	ns.prop[name] = cpt;
	cpt.parent[ns.name] = ns;
	cpt.path = ns.path + "/" + name;
	cpt.value = value;
	if(!protoname) protoname = "Obj";
	var proto = gc(rootns, protoname, 2, 1);
	cpt.proto[protoname] = proto;
//do statistics
	return cpt;
}
/*
function cacheset(ns, key, cpt){
	ns.ns[key] = cpt;
}
function cacheget(ns, key){
	if(ns.ns[key]) return ns.ns[key];
	var precached = ns.ns[key] = {};
	var got;
	for(var i in ns.searchpath){
		var sp = ns.searchpath[i];
		var f = __dirname + "/../" + sp + "/"+ key + ".d";
		if(fs.existsSync(f)){
			var str = fs.readFileSync(f).toString();
			got = str2cpt(ns, str);
			break;
		}
	}
	if(!got) got = newcpt(ns, key);
	if(ns.outlang){
		var tplstr = loadtpl(ns, key);
		if(tplstr != undefined)
			got.tpl[ns.outlang] = tplstr;
	}
	for(var subkey in got)
		precached[subkey] = got[subkey];
	return got;
}

*/

function str2cpt(ns, str){
	if(str == "") return cacheget(ns, "null");
	return analyze(ns, parser.parse(str));
}
function cpt2str(cpt){
	return "";
}


function die(){
	for(var i in arguments){
		console.log(arguments[i]);
	}
	console.log(getStackTrace());
	process.exit();
}
function getStackTrace(){
  var obj = {};
  Error.captureStackTrace(obj, getStackTrace);
  return obj.stack.toString().replace("[object Object]\n","");
}
function mkdirpSync (p, opts, made) {
  if (!opts || typeof opts !== 'object') {
    opts = { mode: opts };
  }
  var mode = opts.mode;
  var xfs = opts.fs || fs;
  if (mode === undefined) {
    mode = 0777 & (~process.umask());
  }
  if (!made) made = null;
  p = path.resolve(p);
  try {
    xfs.mkdirSync(p, mode);
    made = made || p;
  }
  catch (err0) {
    switch (err0.code) {
    case 'ENOENT' :
      made = mkdirpSync(path.dirname(p), opts, made);
      mkdirpSync(p, opts, made);
      break;
      // In the case of any other error, just see if there's a dir
      // there already.  If so, then hooray!  If not, then something
      // is borked.
    default:
      var stat;
      try {
        stat = xfs.statSync(p);
      }
      catch (err1) {
        throw err0;
      }
      if (!stat.isDirectory()) throw err0;
      break;
    }
  }
  return made;
}
