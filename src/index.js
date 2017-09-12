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
	rootns.link.jsImpl = newref(rootns, "jsImpl", newcpt(rootns, "Ns"));
	if(config.gen){
		userns.link.js = newref(rootns, "js", newcpt(rootns, "Ns"));
	}
	var mainfunc = analyze(userns, ast);
	var maincall = newcall(userns, mainfunc, argarr);
	newref(userns, "main", mainfunc);
	var env = newcpt(userns, "Env");
	var result = callfunc(maincall, env);
	if(config.gen){
		gennodejs(result, config.gen)
	}
	archive();
}
function gc(cpt, key, config){
	if(!config) config = {};
	if(key in cpt.ref){
		return cpt.ref[key];
	}
	if(isproto(cpt, "Array") && Number(key) >=0){
		return cpt.value.value[key]
	}

	var rcpt, pns;
	var f = __dirname + "/../"+ cpt.path + "/" + key + ".mm";		
	if(fs.existsSync(f)){
		var str = fs.readFileSync(f).toString();
		var ast = parse(str);
		if(ast)
			rcpt = newref(cpt, key, analyze(cpt, ast));
		else
			rcpt = newref(cpt, key);
		rcpt._old = 1;
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
	if(raw == undefined || raw == null)
		return gc(rootns, "Null", {limit:2})
	if(typeof raw == "string"){
		var strcpt = newcpt(ns, "String");
		strcpt.value = raw;
		return strcpt;
	}
	if(typeof raw == "number"){
		var strcpt = newcpt(ns, "Number");
		strcpt.value = raw;
		return strcpt;
	}
}

function isproto(cpt, tarkey){
	if(tarkey == "Cpt") return 1;
	for(var key in cpt.proto){
		if(tarkey == key) return 1;
		if(isparent(cpt.proto[key], tarkey))
			return 1;
	}
	if(tarkey == "Ref") return 0;
	if(isproto(cpt, "Ref")){
		var ref = _getref(cpt);
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
		var ref = _getref(cpt);
		if(ref)
			return isparent(ref, tarkey);
	}
	return 0;
}

function assign(left, right){
	left._new = 1;
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

	if(!fcpt){
		console.log(refcpt)
		console.log(fcpt)
		die(refcpt.name +" is not function, use 'call *' for dynamic function");
	}

	var cpt = newcpt(ns, "Call");
	if(refcpt._new || (!isproto(fcpt, "Function") && !isproto(fcpt, "Native")) ){
		var callcpt = gc(ns, "call", {limit:2});
		var argcpt = newcpt(ns, "Array")
		argcpt.value = argarr;
		cpt.call = [_getref(callcpt), [refcpt, argcpt], callcpt];
	}else{
		cpt.call = [fcpt, argarr, refcpt];
	}
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
			var argcpt;
			if(ast[2])
				argcpt = analyze(ast.func, e[i]);
			else
				argcpt = analyze(ns, e[i]);
			if(argcpt)
				arr.push(argcpt);
		}
		ast.func.block = arr;
		break;

		case "_precall":
		var callcpt = analyze(ns, e);
		setparent(callcpt, gc(ns, "Precall", {limit:2}));
		callfunc(callcpt, ns);
		if(!ns.precall) ns.precall = [];
		ns.precall.push(callcpt);
		cpt = undefined;
		break;

		case "_normalcall":
		var callcpt = analyze(ns, e);
		if(!isproto(callcpt, "Call")){
			cpt = newcall(ns, gc(ns, "return", {limit:2}), [callcpt]);
		}else{
			cpt = callcpt;
		}
		break;

		case "_newcall"://action
		var fcpt = analyze(ns, e[0]);
		if(e.length > 1){
			var argarr = [];
			for(var i=1; i<e.length; i++){
				if(e[i][0] == "_block"){
					e[i].func = fcpt;
					analyze(ns, e[i]);
				}else{
					var argcpt	= analyze(ns, e[i]);	
					argarr.push(argcpt);
				}
			}
			cpt = newcall(ns, fcpt, argarr);
		}else{
			die("error, newcall")
			cpt = fcpt;
		}
		break;

		case "_array":
		cpt = newcpt(ns, "Array");
		cpt.value = []
		for(var i in e){
			cpt.value.push(analyze(ns, e[i]));
		}
		break;

		case "_function":
		cpt = newcpt(ns, "Function");
		if(e[0] == "_block"){
			e.func = cpt;
			analyze(ns, e);
		}
		break;

		case "_id":
		if(e[0] == "$"){
			//Arguments
			var arg = e.substr(1);
			if(arg != ""){
				cpt = analyze(ns, ['_op', 'get', ['_id', 'arguments'], ['_string', arg]]);
			}else{
				cpt = analyze(ns, ['_id', 'arguments']);
			}
		}else{
//set function name space
			if(ast.assignable){
				cpt = gc(ns, e, {limit:2, assignable:1});
				if(!cpt._old)
					cpt = newcall(ns, gc(ns, "idAssignable", {limit:2}), [raw2cpt(ns, e)]);
			}else{
				cpt = gc(ns, e, {limit:2});
				if(!cpt._old)
					cpt = newcall(ns, gc(ns, "id", {limit:2}), [raw2cpt(ns, e)]);
			}
		}
		break;

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
		if(e == "assign"){
			if(ast[2][0] == "_id")
				ast[2].assignable = 1;
			if(ast[2][0] == "_op" && ast[2][1] == "get")
				ast[2][1] = "getAssignable";
		}
//		if(ast[2][1] == "arguments")
//			console.log(ast[2])
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
function gennodejs(result, config){
	var mainstr = ""
	for(var i in result.cpt){
		 mainstr+= result.cpt[i].value + "\n"
	}
	fs.writeFileSync(config.mount +"/main.js", mainstr)
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
function callnative(env, func, argvp){
	var v = func.value;
	var ns = {
		assign: assign,
		setproto: setproto,
		setparent: setparent,
		isproto: isproto,
		callfunc: callfunc,
		newcall: newcall,
//		gen: gen,
		gc: gc,
		self: env,
		$: [],
		$$: []
	}
	for(var key in argvp){
		var a = argvp[key];
		ns.$[key] = a;
		var b = _getref(a);
		if(b != undefined)
			ns.$$[key] = b.value;
		else
			ns.$$[key] = undefined;
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
	return result;
}

function genfunc(cpt, config){
	var tcall = _get(cpt, "call");
	var func = tcall[0];
	var argv = tcall[1];
	var funcref = tcall[2];
/*
	var lang;
	for(var proto in config){
		if(isproto(func, proto)){
			lang = config[proto]
			break;
		}
	}
	if(!lang) die("error")
*/
	

}
function procarg(arg, ns){
	if(isproto(arg, "Call")){
		return callfunc(arg, ns).value;
	}else if(isproto(arg, "Array")){
		var res = newcpt(arg, "Array");
		res.value = [];
		for(var j in arg.value){
			res.value[j] = procarg(arg.value[j], ns);
		}
		return res;
	}else{
		return arg;
	}	
}
function callfunc(cpt, env){
	var tcall = _get(cpt, "call");
	if(!tcall){
		console.log(cpt)
		die("wrong call")
	}
	var func = tcall[0];
	var argv = tcall[1];
	var argvp = [];
	for(var i in argv){
		argvp[i] = procarg(argv[i], env);
	}
//	setparent(env, func);
	var argcpt = newcpt(cpt, "Array");
	argcpt.value = argvp;
	newref(env, "arguments", argcpt);

	var printstr = "";
	for(var i in argvp){
		printstr += argvp[i].path + ",";
	}
	console.log("call:  " + env.path +" "+  tcall[2].path + "\n\t" + printstr);

	cpt.cpt = [];
	var result;
	if(isproto(func, "Native")){
		var resultstr = callnative(env, func, argvp);
		if(typeof resultstr != "object")
			result = raw2cpt(cpt, resultstr);
		else
			result = resultstr;
		cpt.cpt.push(result.value);
	}else{
		var newenv = newcpt(env, "Env");
		setparent(newenv, env);
		setparent(newenv, func);
		var step = _get(func, "block");
		for(var i in step){
			var scpt = step[i];
			var tmpcpt = callfunc(scpt, newenv);
			cpt.cpt.push(tmpcpt.value);
			if(isproto(tmpcpt, "return")){
				result = tmpcpt.value;
				break;
			}else{
				result = tmpcpt;
			}
		}
	}
	if(isproto(result, "Call"))
		cpt.value = result.value;
	else
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
	if(!proto) proto = "Cpt";
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
