var version = "5.0.0";
var fs = require("fs");
var path = require("path");
var parser = require("./parser");
var tmpl = require("./tmpl");

var rootns = rawcpt("rootns");
rootns.prop.rootns = rootns;
var tplcache = {};
var codecache = {};
var todump = {};
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
function g(hash, keystr){
	var cpt = getvcont(gc(hash, keystr));
	if(cpt != undefined) return cpt.value;
}
*/

function gc(hash, keystr){
	var arr = keystr.split("\/");
	var cpt = hash;
	for(var i in arr){
		var ncpt = _gc(cpt, arr[i]);
		if(!ncpt) cpt = newcpt(cpt, undefined, undefined, arr[i]);
		else cpt = ncpt;
	}
	return cpt;
}

function _gc(hash, key, limit){
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
	if(limit)
		return;
	for(var p in hash.parent){
		var cpt = _gc(hash.parent[p], key);
		if(cpt) return cpt;
	}
//	return newcpt(hash, undefined, undefined, key);
}
function s(hash, keystr, raw){
	sc(hash, keystr, raw2cpt(hash, raw));
}
function sc(hash, key, cpt){
	hash.prop[key] = cpt;
	if(cpt.name[0] == "$"){
		var oldkey = cpt.name;
		cpt.name = key;
		cpt.path = hash.path + "/" + key;
		for(var keyp in cpt.parent){
			var p = cpt.parent[keyp];
			delete p.prop[oldkey];
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
}
function bootstrap(config){
//todo config
//	sc(rootns, "$searchpath",
//		newcpt($rootns, ["d", "db"], "Array"));
	var userns = newcpt(rootns, undefined, undefined, config.user);
	var ast = parse(config.code);
	var main = analyze(userns, ast);
	sc(userns, "main", main);
	return main;//ast -> cpt
}
function parse(src){
	if(src == undefined || src == null) src = ";";
	return parser.parse(src);
}
function newcall(ns, fcpt, argarr){
	var cpt = newcpt(ns, undefined, "Call");
	sc(cpt, "function", fcpt);
	var acpt = newcpt(cpt, argarr, "Arguments", "arguments");
	var at = _gc(fcpt, "callatanalyze", 1);
	if(at)
		callfunc(newcall(ns, at, argarr));
	return cpt;
}
function analyze(ns, ast){
	var c = ast[0];
	var e = ast[1];
	var cpt;
	switch(c){
		case "_function":
		cpt = newcpt(ns, [], "Function");
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
			cpt = newcall(ns, gc(rootns, "get"), [newcpt(ns, e, "String")]);
		}else{
			cpt = gc(ns, e);
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
		cpt = newcall(ns, _gc(rootns, e), [left, right]);
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
function archive(){
}
function extend(){
}
function callnative(cpt){
	var func = _gc(cpt, "function", 1);
	var v = func.value;
	var ns = {};
	var arg = _gc(cpt, "arguments", 1);
	var env = _gc(cpt, "env", 1);
	for(var key in arg.value){
		var a = arg.value[key];
		ns["$$"+key] = a;
		ns["$"+key] = a.value;
	}
	ns.$ = {
		assign: assign,
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
	var func = _gc(cpt, "function", 1);
	console.log("call " + func.path);
	var arg = _gc(cpt, "arguments", 1);
	sc(cpt, "env", newcpt());
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
		sc(cpt, "result", newcpt());
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
	if(!ns) 
		return rawcpt("$");
	if(!name){
		name = "$" + (protoname || "name") + (ns.nexti++);
	}
	var cpt = rawcpt(name);
	ns.prop[name] = cpt;
	cpt.parent[ns.name] = ns;
	cpt.path = ns.path + "/" + name;
	cpt.value = value;
	if(!protoname) protoname = "Obj";
	var proto = gc(rootns, protoname);
	cpt.proto[protoname] = proto;
//do statistics
	return cpt;
}
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
