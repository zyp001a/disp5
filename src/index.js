var version = "5.0.0";
var fs = require("fs");
var path = require("path");
var parser = require("./parser");
var tmpl = require("./tmpl");

var rootns = rawcpt("rootns");
rootns.path = "rootns";
rootns.ref.rootns = rootns;
rootns.ref.Ref = rawcpt("Ref");
rootns.from = rootns;
rootns.isroot = 1;
rootns.link.jsImpl = newref(rootns, "jsImpl", newcpt(rootns, "Ns"));
rootns.link.init = newref(rootns, "init", newcpt(rootns, "Ns"));

var tplcache = {};
var codecache = {};
var topersist= {};
var userns;
module.exports = function(config, fn){
	console.log("#Disp version: "+ version);
//	userns = bootstrap(config);
	var argarr = [];
	for(var i=1; i<process.argv.length; i++){
		argarr.push(raw2cpt(rootns, process.argv[i]));
	}
	var userns = newref(rootns, config.user, newcpt(rootns, "Ns"));
	var ast = parse(config.code);
	var mainfunc = analyze(userns, ast);
	newref(userns, "main", mainfunc);
	var maincall = newcall(userns, mainfunc, argarr);
	callfunc(maincall);
	archive();
}
function gc(cpt, key, config){
	if(!config) config = {};
	if(key in cpt.ref){
		return cpt.ref[key];
	}

	var f = __dirname + "/../"+ cpt.path + "/" + key + ".mm";
	var rcpt, pns;
		
	if(fs.existsSync(f)){
		var str = fs.readFileSync(f).toString();
		var ast = parse(str);
		if(ast)
			rcpt = newref(cpt, key, analyze(cpt, ast));
		else
			rcpt = newref(cpt, key);
	}
	if(config.assignable){
		if(rcpt) return rcpt;
		return newref(cpt, key);
	}
	if(!rcpt){
		for(var p in cpt.proto){
			rcpt = gc(cpt.proto[p], key, {
				limit: config.limit,
				notnew: 1
			});
			if(rcpt)
				break;
		}
	}
	if(!rcpt && config.limit){
		for(var p in cpt.parent){
			rcpt = gc(cpt.parent[p], key, {
				limit: config.limit,
				notnew: 1
			});
			if(rcpt)
				break;
		}
	}
	if(!rcpt && config.limit > 1){
		for(var p in cpt.link){
			rcpt = gc(cpt.link[p], key, {
				limit: config.limit-1,
				notnew: 1
			});
			if(rcpt)
				break;
		}
	}

	if(config.notnew)
		return rcpt;

	if(!rcpt){
		rcpt = newref(cpt, key);
	}
/*else if(!isproto(cpt, "Shadow")){
		var tmpcpt = newcpt(cpt, proto, key);
		setproto(tmpcpt, rcpt);
		rcpt = tmpcpt;
	}
*/
	return rcpt;
}

function raw2cpt(ns, raw){
	if(typeof raw == "string"){
		var strcpt = newcpt(ns, "String");
		strcpt.value = raw;
		return strcpt;
	}
}

function isproto(cpt, tarkey){
	for(var key in cpt.proto){
		if(tarkey == key) return 1;
		if(isparent(cpt.proto[key], tarkey))
			return 1;
	}
	if(tarkey == "Ref") return 0;
	if(isproto(cpt, "Ref")){
		var ref = _get(cpt, "ref");
		if(ref)
			return isproto(ref, tarkey);
	}
	return 0;
}
function isparent(cpt, tarkey){
	for(var key in cpt.parent){
		if(tarkey == key) return 1;
		if(isparent(cpt.parent[key], tarkey))
			return 1;
	}

	if(isproto(cpt, "Ref")){
		var ref = _get(cpt, "ref");
		if(ref)
			return isparent(ref, tarkey);
	}
	return 0;
}

function assign(left, right){
	left.value = right;
}
function setparent(cpt, pcpt){
	cpt.parent[pcpt.name] = pcpt;
}
function setproto(cpt, pcpt){
	cpt.proto[pcpt.name] = pcpt;
}
function setlink(cpt, pcpt){
	cpt.link[pcpt.name] = pcpt;
}

//setproto

function parse(src){
	if(src == undefined || src == null || src == "") return;
	return parser.parse(src);
}
function newcall(ns, refcpt, argarr){
	if(!refcpt)
		die("wrong newcall");
	var fcpt = _getref(refcpt);
	if(!fcpt || (!isproto(fcpt, "Function") && !isproto(fcpt, "Native"))){
		die(fcpt.name +" is not function, use 'call *' for dynamic function");
	}
	var cpt = newcpt(ns, "Call");
	cpt.call = [fcpt, argarr];
	setlink(cpt, fcpt);
/*
	if(isproto(fcpt, "Precall")){
		var pfcpt = argarr.shift();
		callfunc(newcall(ns, pfcpt, argarr));
		cpt = undefined;
	}
*/
	return cpt;
}
function analyze(ns, ast){
	var c = ast[0];
	var e = ast[1];
	var cpt;
	switch(c){

		case "_block":
		var arr = [];
		for(var i in e){
			var argcpt = analyze(ns, e[i]);
			if(argcpt)
				arr.push(argcpt);
		}
		ns.block = arr;
		break;
/*
		case "_newcpt":
		cpt = newcpt(ns, ast[2], ast[3]);
		var arr = [];
		for(var i in e){
			arr.push(analyze(cpt, e[i]));
		}
		if(ast[2] == "Function"){
			cpt.function = arr;
		}else{
			fcpt = newcpt(cpt, "Function", "create");
			fcpt.function = arr;
			callfunc(newcall(cpt, fcpt));
		}
		break;
*/
		case "_precall":
		var callcpt = analyze(ns, e);
		callfunc(callcpt);
		if(!ns.precall) ns.precall = [];
		ns.precall.push(callcpt);
		cpt = undefined;
		break;

		case "_function":
		cpt = newcpt(ns, "Function");
		if(e[0] == "_block"){
			if(e[2])//newns
				analyze(cpt, e);					
			else
				analyze(ns, e);
		}
		break;

		case "_newcall"://action
		var fcpt = analyze(ns, e[0]);
		if(e.length > 1){
			var argarr = [];
			for(var i=1; i<e.length; i++){
				if(e[i][0] == "_block"){
					if(e[i][2])//newns
						analyze(fcpt, e[i]);					
					else
						analyze(ns, e[i]);
				}else{
					var argcpt	= analyze(ns, e[i]);	
					argarr.push(argcpt);
				}
			}
			cpt = newcall(ns, fcpt, argarr);
		}else{
			cpt = fcpt;
		}
		break;

		case "_id":
		if(ast.assignable)
			cpt = gc(ns, e, {limit:2, assignable:1});
		else
			cpt = gc(ns, e, {limit:2});
		break;

/*
		case "_dickey":
		cpt = gc(ns, "RefDickey", e);
		break;
*/

		case "_string":
		cpt = newcpt(ns, "String");
		cpt.value = e;
		break;

		case "_number":
		cpt = newcpt(ns, "Number");
		cpt.value = e;
		break;

		case "_native":
		cpt = newcpt(ns, "Native");
		cpt.value = e;
		break;
		
		case "_op":
		if(e == "assign" || e == "preassign"){
			if(ast[2][0] == "_id")
				ast[2].assignable = 1;
			if(ast[2][0] == "_op" && ast[2][1] == "get")
				ast[2][1] = "getAssignable"
		}
		var left = analyze(ns, ast[2]);
		var right;
		if(ast[3]) right = analyze(ns, ast[3]);
		cpt = newcall(ns, gc(ns, e, {
			limit:2
		}), [left, right]);
		break;

		default:
		die(ast[0] + " is not defined");
	}
	ast.cpt = cpt;
	return cpt;
}
function getv(ns, refname){
	var ref = gc(ns, "Ref", refname);
	var tref = _getref(ref);
	if(tref) return tref.value;
	else return;
}
function gen(ns){
//	var main = gc(ns, "Function", "main");
	var arch = _getref(gc(ns, "Ref", "arch"));
	var mount = getv(ns, "mount");
	var tree = _get(gc(arch, "RefDickey", "tree"), "value");
	for(var f in tree.ns.RefDickey){
		var v = _get(tree.ns.RefDickey[f], "value");
		console.log(f);
		console.log(v);
	}
//	var program = callfunc(newcall(ns, tree));
//	cpt2str(main);
	return;
}
function archive(){
	for(var key in topersist){
		var cpt = topersist[key];
		if(cpt.path.match(/\$/))
			continue;
		subarchive(cpt);
	}
}
function subarchive(pcpt){
	writecpt(pcpt);
	for(var key in pcpt.ref){
		var cpt = pcpt.ref[key];
		if(cpt.name[0] == "$")
			continue;
		subarchive(cpt);
	}
}
function writecpt(cpt){
	console.log("write "+cpt.path);
	console.log(cpt);
}
function cpt2str(cpt){
	return "";
}
function extend(){
}
function _getref(cpt){
	if(!isproto(cpt, "Ref")) return cpt;
	var ref = _get(cpt, "value");
	if(!ref) return;
	if(!isproto(ref, "Ref"))
		return ref;
	else
		return _getref(ref);
}
function _get(cpt, tar){
	if(tar in cpt)
		return cpt[tar];
	for(var key in cpt.proto){
		var v = _get(cpt.proto[key], tar);
		if(v != undefined)
			return v;						 
	}
		
}
function callnative(cpt, func, argvp){
	var ns = {};
	var v = func.value;
	for(var key in argvp){
		var a = argvp[key];
		ns["$$"+key] = a;
		var b = _getref(a);
		if(b != undefined)
			ns["$"+key] = b.value;
		else
			ns["$"+key] = undefined;
	}
	ns.$ = {
		assign: assign,
		setproto: setproto,
		setparent: setparent,
		isproto: isproto,
		gen: gen,
		gc: gc,
		ns: cpt.from,
		self: cpt
	}
	var result;
	try{
		with(ns){
			result = eval("(function(){"+v+"})()");
		}
	}catch(err){
		console.log(ns);
		console.log(v);
		with(ns){
			eval("(function(){"+v+"})()");
		}
		die( "error");
	}
	if(result == undefined) result = "";
	return result;
}

function callfunc(cpt, flag){
	var tcall = _get(cpt, "call");
	var func = tcall[0];
	var argv = tcall[1];
	var argvp = [];
	for(var i in argv){
		if(isproto(argv[i], "Call")){
			argvp[i] = callfunc(argv[i]).value;
		}else{
			argvp[i] = argv[i];
		}
	}

	var printstr = "";
	for(var i in argvp){
		printstr += argvp[i].path + ",";
	}
	var result;
	if(isproto(func, "Native")){
		console.log("callnative: " + func.value + "\n\t" + printstr);
		var resultstr = callnative(cpt, func, argvp);
		if(typeof resultstr != "object")
			result = raw2cpt(resultstr);
		else
			result = resultstr;
	}else{
		console.log("callfunc: " + func.path);
		var step = _get(func, "block");
		for(var i in step){
			var scpt = step[i];
			var tmpcpt = callfunc(scpt);
			if(isproto(tmpcpt, "Return")){
				result = tmpcpt.value;
				break;
			}else{
				result = tmpcpt;
			}
		}
	}
	cpt.value = result;
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

		proto: {}, //connect to others
		parent: {},
		link: {},

		ns: {},
		ref: {},
		
		stat: {},
		nexti: 0
	}
	return cpt;
}
function copycpt(ns, proto, cpt){
	if(! proto in ns.ns){
		ns.ns[proto] = {};
	}
	var newcpt = ns.ns[proto][cpt.name] = {};
	for(var key in cpt){
	}
}
function newref(ns, key, ref){
	var refcpt = newcpt(ns, "Ref", key);
	ns.ref[key] = refcpt;
	refcpt.value = ref;
	return refcpt;
}
function newcpt(ns, proto, name){
	if(typeof proto == "string"){
		protocpt = gc(ns, proto, {limit:2});
	}else{
		protocpt = proto;
		proto = proto.name;
	}
	if(!name){
		name = "$" + (proto || "name") + (ns.nexti++);
	}
	var cpt = rawcpt(name);
	if(!(proto in ns.ns)){
		ns.ns[proto] = {};
	}
	ns.ns[proto][name] = cpt;
	cpt.path = ns.path + "/" + name;
	cpt.from = ns;
	if(!proto) proto = "Cpt";
	var protocpt;
	cpt.proto[proto] = protocpt;
//	if(proto == "Function" || proto == "Ns")
	setparent(cpt, ns);
	return cpt;
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
