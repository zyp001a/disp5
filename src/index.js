var version = "5.0.0";
var fs = require("fs");
var path = require("path");
var parser = require("./parser");
var child = require("child_process");

var gcpath = ["custom", "rootns"];
var rootns = rawcpt("rootns");
//var Ref = rawcpt("Ref");
rootns._isroot = 1;
rootns.file = "";
rootns.path = "";
rootns._indent = 0;
rootns.global = rootns;
newref(rootns, "rootns", rootns);

var globalenv = _getref(gc(rootns, "global", {initref:1}));
globalenv.global = globalenv;
var funcsenv = _getref(gc(rootns, "funcs", {initref:1}));
//rootns.ref.rootns = rootns;
//rootns.ref.Ref = Ref;
//rootns.from = rootns;
setlink(rootns, gc(rootns, "jsImpl", {initref:1}));
setlink(rootns, gc(rootns, "basic", {initref:1}));
setlink(rootns, gc(rootns, "Lang", {initref:1}));
setlink(rootns, gc(rootns, "Arch", {initref:1}));
setlink(rootns, gc(rootns, "String", {initref:1}));
setlink(rootns, gc(rootns, "string", {initref:1}));
setlink(rootns, gc(rootns, "web", {initref:1}));

//var tplcache = {};
//var codecache = {};
//var topersist= {};

module.exports = function(config, fn){
	console.error("#Disp version: "+ version);

	if(config.trans){
		var str = render(config.code, rootns);
		console.error("write: "+config.outfile)
		fs.writeFileSync(config.outfile, str);
		return;
	}
	var ast = parse(config.code);
	var tree, mount, arch, pseudo;
	if(config.gen){
		mount = gc(rootns, "mount", {initref:1});
		mount.value.file = config.mount;
		arch = _getref(gc(rootns, config.arch, {notlocal: 1}));
		var pre = gc(arch, "pre");
		tree = gc(arch, "tree");
		docall(newcall(pre), rootns);
		pseudo = 1;
	}
//make argcpt
	var argappend = "";
	var argarr = [];
	for(var i=3; i<process.argv.length; i++){
		if(i!=3) argappend += " " + process.argv[i];
		var subargcpt = raw2cpt(process.argv[i]);
		argarr.push(subargcpt);
	}
	argarr.ismain = raw2cpt(1);
//	var argcpt = newarr(argarr);
	var argcpt = newcall(gc(rootns, "array", {notlocal: 1}), argarr);
//make main
	var mainfunc = analyze(globalenv, ast, 1);
	var maincpt = newref(rootns, "main", mainfunc);
//call
	var call = newcall(gc(rootns, "call", {notlocal: 1}), [maincpt, argcpt]);
	var result = docall(call, globalenv, pseudo);
// gen
	if(config.gen){
		docall(newcall(tree), rootns);
		for(var f in mount.value.ref){
			var fcpt = mount.value.ref[f];
			if(!fs.existsSync(fcpt.file))
				mkdirpSync(path.dirname(fcpt.file))
			console.error("write: "+fcpt.file)
			fs.writeFileSync(fcpt.file, fcpt.value.value)
		}
		console.log("#Exec:")
		process.stdout.write(child.execSync("node "+config.mount + "/main.js"+ argappend))
	}
}

function _eval(code, env, pseudo){
	code = "{" + code + "}";
	var ast = parse(code);

	var func = analyze(rootns, ast);
	var currenv = newcpt(rootns);
	if(env.ref.args)
		currenv.ref.args = env.ref.args
	newref(currenv, "env", env);
	var result = doexec(func, currenv, pseudo);
	return result;
}
/*
config:
notlocal?
notnew?
initref?
*/
function gc(cpt, key, config, history){
	if(!cpt) die("gc: " +key+", cpt undefined")
	var vcpt = _getref(cpt);
//	if(!history) console.log("!!!!"+key);
//	else console.log(":"+cpt.file+"\t"+vcpt.path);

	if(!config) config = {};
	if(!history) history = {};

	if(!vcpt) {
		console.error(cpt)
		console.error(vcpt)
		die("gc: cpt null ref, "+key)
	}
	if(history[vcpt.path])
		return;
	var rcpt, pns;
	if(!config.excludelocal){
		if(key in vcpt.ref){
			return vcpt.ref[key];
		}
//Array return by value
//	if((isproto(vcpt, "Array") || isproto(vcpt, "String")) && Number(key) >=0){
//		return vcpt.value[key];
//	}
		for(var gcpathi in gcpath){
			var gcpathe = gcpath[gcpathi];
			var f = __dirname + "/../"+ gcpathe + cpt.file + "/" + key;
			if(fs.existsSync(f+".mm")){
				var str = fs.readFileSync(f+".mm").toString();
				var ast = parse(str);
				var func;
				if(ast)
					func = analyze(vcpt.from || vcpt, ast);
				else
					func = newcpt(vcpt, "Function");
				rcpt = newref(vcpt, key, func);
				rcpt._old = 1;
				if(fs.existsSync(f+".pmm")){
					var str2 = fs.readFileSync(f+".pmm").toString();
					var ast2 = parse(str2);
					var func2;
					if(ast2)
						func2 = analyze(vcpt.from, ast2);
					else
						func2 = newcpt(vcpt, "Function");
					func._pseudo = func2;
				}
			}else if(fs.existsSync(f+".tpl")){
				var str = fs.readFileSync(f+".tpl").toString();
				var funccpt = newcpt(vcpt, "Function");//Render
				funccpt.block = [
					newcall(gc(rootns, "make", {notlocal: 1}), [raw2cpt(str)])
				]
				rcpt = newref(vcpt, key, funccpt);
				rcpt._old = 1;
			}else if(fs.existsSync(f+".str")){
				var str = fs.readFileSync(f+".str").toString();
				rcpt = raw2cpt(str);
			}
		}
	}
//record vcpt into history
	history[vcpt.path] = 1;
	if(config.notlocal){//not local
		if(!rcpt){
			for(var p in vcpt.link){
				rcpt = gc(vcpt.link[p], key, {
					notlocal: 1,
					notnew: 1
				}, history);
				if(rcpt){
					break;
				}
			}
		}
		if(!rcpt && !vcpt._isroot){
			for(var p in vcpt.parent){
				rcpt = gc(vcpt.parent[p], key, {
					notlocal: 1,
					notnew: 1
				}, history);
				if(rcpt)
					break;
			}
			if(!rcpt && !cpt._isroot){
				rcpt = gc(cpt.from, key, {
					notlocal: 1,
					notnew: 1
				}, history);
			}
		}
	}
	if(!rcpt){
		for(var p in vcpt.proto){
			rcpt = gc(vcpt.proto[p], key, {
				notlocal: config.notlocal,
				notnew: 1
			}, history);
			if(rcpt)
				break;
		}
	}
	if(config.notnew)
		return rcpt;

	if(!rcpt){
		var newenv;
		if(config.notlocal)
			newenv = cpt.global;
		else
			newenv = vcpt;
		rcpt = newref(newenv, key);
		if(config.initref){
			rcpt.value = newcpt(newenv);
			rcpt.value.file = newenv.file +"/" + key;
		}
	}else{
		if(_getref(rcpt)){
			var init = gc(rcpt, "init", {notnew:1});
			if(init) docall(newcall(init), rootns)
		}
	}
	return rcpt;
}

function raw2cpt(raw){
	if(raw == undefined){
		return gc(rootns, "Undefined", {notlocal:1})
	}
	if(raw == null)
		return gc(rootns, "Null", {notlocal: 1})
	if(typeof raw == "string"){
		var strcpt = newcpt(rootns, "String");
		strcpt.value = raw;
		strcpt._raw = 1;
		return strcpt;
	}
	if(typeof raw == "number"){
		var strcpt = newcpt(rootns, "Number");
		strcpt.value = raw;
		strcpt._raw = 1;
		return strcpt;
	}
	if(typeof raw == "boolean"){
		var strcpt = newcpt(rootns, "Boolean");
		strcpt.value = raw;
		strcpt._raw = 1;
		return strcpt;
	}
	return raw;
}

function isproto(cpt, tarkey){
	if(tarkey == "Cpt") return 1;
	if(cpt._isref){
		var ref = _getref(cpt);
		if(ref)
			return isproto(ref, tarkey);
	}else{
		for(var key in cpt.proto){
			if(tarkey == key) return 1;
			if(isparent(cpt.proto[key], tarkey))
				return 1;
		}
	}
	return 0;
}
function isparent(cpt, tarkey){
	if(cpt._isref){
		var ref = _getref(cpt);
		if(ref)
			return isparent(ref, tarkey);
	}else{
		for(var key in cpt.parent){
			if(tarkey == key) return 1;
			if(isparent(cpt.parent[key], tarkey))
				return 1;
		}
	}
	return 0;
}

function assign(left, right){
	left._new = 1;
	if(left.from._length && Number(left.name) > left.from._length - 1)
		left.from._length = Number(left.name) + 1;
		
	left.value = right;
}
function setparent(cpt, pcpt){
	cpt = _getref(cpt)
	cpt.parent[pcpt.name] = pcpt;
}
function setproto(cpt, pcpt){
	cpt = _getref(cpt)
	cpt.proto[pcpt.name] = pcpt;
}
function setlink(cpt, pcpt){
	cpt = _getref(cpt)
	cpt.link[pcpt.name] = pcpt;
}

//setproto

function parse(src){
	if(src == undefined || src == null || src == "") return;
	return parser.parse(src);
}
function newcall(refcpt, argarr){

	if(!refcpt){
		die("newcall: no ref");
	}
	if(!refcpt._isref){
		console.error(refcpt)
		die("newcall: ref is not ref");
	}

	var fcpt = _getref(refcpt);

	if(!fcpt){
		console.error(refcpt.name)
		console.error(fcpt)
		die("newcall: ref to null");
	}
	var cpt = newcpt(rootns, "Call");
	cpt.call = [refcpt, argarr];
	setlink(cpt, fcpt);
	return cpt;
}
function analyze(ns, ast, mainflag){
	if(!ns) die("analyze: null ns")
	var c = ast[0];
	var e = ast[1];
	var cpt;
	switch(c){

//make at analysis
		case "_block":
		var proto = ast[2] || "Hash";
		cpt = newcpt(ns, proto);
		cpt._raw = 1;
		if(mainflag){
			cpt._main = 1;
			cpt._indent = 0;
		}else{
			if(ns._indent == undefined){
				console.log(ns)
				die()
			}
			cpt._indent = ns._indent + 1;
		}
/*
		var initfunc = gc(ns, "init"+proto, {notlocal: 1, notnew:1});
		if(initfunc)
			docall(newcall(initfunc, [cpt]), rootenv);
*/
		var arr = [];
		for(var i in e){
			var argcpt = analyze(cpt, e[i]);
			if(argcpt)
				arr.push(argcpt);
		}
		cpt.block = arr;
		var lastcall = arr[arr.length -1];
		if(proto == "Function" && lastcall.call[0].name != "return")
			arr[arr.length -1] = newcall(gc(ns, "return", {notlocal: 1}), [lastcall])
		if(ast[3]){
			cpt._argsdef = ast[3]
//			newref(cpt, "argsDef", ast[3]);
		}
		break;

		case "_string":
		cpt = newcpt(ns, "String");
		cpt._raw = 1;
		cpt.value = e.replace("\\'", "'").replace("\\\"", "\"").replace("\\n", "\n").replace("\\r", "\r").replace("\\t", "\t");
		break;

		case "_number":
		cpt = newcpt(ns, "Number");
		cpt._raw = 1;
		cpt.value = e;
// broke return mechnism
//		cpt = newcall(gc(ns, "raw", {notlocal: 1}), [raw2cpt(e)]);
		break;

		case "_native":
		cpt = newcpt(ns, "Native");
		cpt._raw = 1;
		cpt.value = e;
		break;



//call method, make at call
		case "_precall":
		cpt = analyze(ns, e);
		setproto(cpt, gc(ns, "Precall", {notlocal: 1, initref: 1}));
		break;

		case "_normalcall":
		var callcpt = analyze(ns, e);
		if(!isproto(callcpt, "Call")){
			cpt = newcall(gc(ns, "return", {notlocal: 1}), [callcpt]);
/*		}
else if(isproto(callcpt.call[0], "Precall")){
*/		
		}else{
			cpt = callcpt;
		}
		break;

		case "_newcall"://action
		var fcpt = analyze(ns, e[0]);
		if(e.length <= 1){
			die("error, newcall")
		}
		var argarr = [];
		for(var i=1; i<e.length; i++){

			var argcpt	= analyze(ns, e[i]);
			argarr.push(argcpt);
		}
		if(fcpt._new || 
			 (!isproto(fcpt, "Function") && !isproto(fcpt, "Native")) ){
//user defined function
			var callcpt = gc(ns, "call", {notlocal: 1});
			
			var argcpt = newarr(argarr);
			cpt = newcall(callcpt, [fcpt, argcpt]);
		}else{
//predefined function
			if(isproto(fcpt, "Precall")){
				argarr.unshift(ns);
				cpt = docall(newcall(fcpt, argarr), ns);
			}else{
				cpt = newcall(fcpt, argarr);
			}
		}
		break;

		case "_getid":
		if(ast[2] == "local")
			cpt = newcall(gc(ns, "id"), [analyze(ns, e)]);
		else
			cpt = newcall(gc(ns, "id", {notlocal: 1}), [analyze(ns, e)]);
		break;

		case "_getrepr":
		cpt = newcall(gc(ns, "repr", {notlocal: 1}), [analyze(ns, e)]);
		break;

		case "_array":
		var rawarr = [];
		for(var i in e){
			rawarr.push(analyze(ns, e[i]));
		}
		cpt = newcall(gc(ns, "array", {notlocal: 1}), rawarr);
		break;


		case "_id":
		cpt = gc(ns, e, {notlocal: 1});
		if(!cpt._old){
			cpt = newcall(gc(ns, "id", {notlocal: 1}), [raw2cpt(e)]);
		}
		break;

		case "_local":
		cpt = gc(ns, e);
		if(!cpt._old){
			cpt = newcall(gc(ns, "id", {notlocal: 1}), [raw2cpt(e), raw2cpt("local")]);
		}
		break;

		case "_notlocal":
		cpt = gc(ns, e);
		if(!cpt._old){
			cpt = newcall(gc(ns, "id", {notlocal: 1}), [raw2cpt(e), raw2cpt("notlocal")]);
		}
		break;

		default:
		console.error(ast)
		die(ast[0] + " is not defined");
	}
	ast.cpt = cpt;
	return cpt;
}



function cpt2str(cpt){
	return "";
}
function extend(){
}
function _getref(cpt){
	if(!cpt._isref) return cpt;
	var ref = _get(cpt, "value");
	if(!ref) return;
	if(!ref._isref)
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
function callnative(env, func, argvp, pseudo){
	var v = func.value;
	var ns = {
/*
		assign: assign,
		setproto: setproto,
		setparent: setparent,
		isproto: isproto,
		docall: docall,
		newcall: newcall,
		render: render,
		gc: gc,
*/
		self: env,
		ns: env.from,
		$: [],
		$$: []
	}
	for(var key in argvp){
		var a = argvp[key];
		ns.$[key] = a;
		var b = _getref(a);
		if(b != undefined){
			ns.$$[key] = b.value;
		}else{
			ns.$$[key] = undefined;
		}
	}
	var result;
	try{
		with(ns){
			result = eval("(function(){"+v+"})()");
		}
	}catch(err){
		console.error(v);
		with(ns){
			eval("(function(){"+v+"})()");
		}
		die( "error");
	}
	return result;
}

function procarg(arg, ns, pseudo){
	if(isproto(arg, "Call")){
		return docall(arg, ns, pseudo);
	}else{
		return arg;
	}
}

function doexec(funcref, env, pseudo){
	var func = _getref(funcref);
//	func.cpt = [];
	var result;
	var step = _get(func, "block");
	for(var i in step){
		var scpt = step[i];
		var tmpcpt = docall(scpt, env, pseudo);
		result = tmpcpt;
		
		if(isproto(tmpcpt, "Break") || isproto(tmpcpt, "Continue")){
			return result;
		}
	}
	return result;
}
function docall(cpt, env, pseudo, notdoarg){

	if(!isproto(cpt, "Call")){
		console.log(cpt);
		die("docall: unknown call type");
	}
	var tcall = _get(cpt, "call");
	if(!tcall){
		console.error(cpt)
		die("wrong call")
	}
	var orifunc = _getref(tcall[0]);
	var func;
	if(pseudo && orifunc._pseudo){
		func = orifunc._pseudo;
	}else{
		func = orifunc
	}
	var argv = tcall[1];
	var argvp;
	if(notdoarg){
		argvp = argv;
	}else{
		argvp = [];
		for(var i in argv){
			argvp[i] = procarg(argv[i], env, pseudo);
		}
	}
//	setparent(env, func);

	var printstr = "";
	for(var i in argvp){	
		if(isproto(argvp[i], "String") || isproto(argvp[i], "Number")){
			printstr += argvp[i].path + ":" +  argvp[i].value + ",";
		}else{
			printstr += argvp[i].path + ",";
		}
	}
//	console.error("docall: "+tcall[0].name + "("+printstr+")"+pseudo);
//	cpt.cpt = [];
	var result;

	if(!isproto(func, "Function") && !isproto(func, "Native")){
		console.error(func)
		die("docall: not Function or Native")
	}
	var newenv = newcpt(env, "Env");
	setparent(newenv, env);
	setparent(newenv, func);

	var argcpt = newarr(argvp);
	newref(newenv, 'args', argcpt);
	newref(newenv, "func", func);

	if(isproto(func, "Native")){

		var resultstr = callnative(newenv, func, argvp, pseudo);
		if(typeof resultstr != "object")
			result = raw2cpt(resultstr);
		else
			result = resultstr;
	}else if(isproto(func, "Function")){
		var argsDef = func._argsdef;
//		if(tcall[0].name == "print"){
//			console.log(tcall[0].name);
//			console.log(argvp);
//		}
		for(var i in argsDef){
			newref(newenv, argsDef[i], argvp[i]);
		}
		var step = _get(func, "block");
		for(var i in step){
			var scpt = step[i];
			var tmpcpt = docall(scpt, newenv, pseudo);
//			cpt.cpt.push(tmpcpt.value);
			if(isproto(tmpcpt, "Return")){
				result = tmpcpt.value;
  			break;
			}else{
				result = tmpcpt;
			}
		}
		if(!result) result = raw2cpt(cpt)
	}

//	if(isproto(result, "Call"))
//		cpt.value = result.value;
//	else
	cpt.value = result;

	if(pseudo && !("repr" in cpt)){
		cpt.repr = dogen(tcall[0], orifunc, argv, env);
	}
	return result;
}
function dogen(ref, func, argv, env){
	for(var i in argv){
		var arg = argv[i];
		if(!isproto(arg, "Call")){
			var rarg = _getref(arg);
			if(!rarg._raw){
/*
				console.error(i);
				console.error(rarg);
				console.error(ref.name);
				die("dogen: arg error");	
do not die!
*/
			}else{
				var pproto = Object.keys(rarg.proto)[0];
				var makefuncref = gc(env, "make"+pproto, {notlocal: 1, notnew:1});
				if(makefuncref){
					var strcpt = docall(newcall(makefuncref, [rarg]), env, 0, 1);
					if(strcpt){
						rarg.repr = strcpt.value;
					}
				}else{
					die("no make"+pproto)
				}
			}
		}
	}
	var repr;

	if(isproto(func, "Native")){
		var makefuncref = gc(env, "make"+ref.name, {notlocal: 1, notnew:1});
		if(makefuncref){
			var strcpt = docall(newcall(makefuncref, argv), env, 0, 1);
			repr = strcpt.value;
		}else{
			die("dogen: no make"+ref.name)
		}
	}else{
		//manually make new function and add to funcenv
		if(func._main) return "";
		var makefuncref = gc(env, "makecall", {notlocal: 1, notnew:1});
		var reprcpt = newcpt(env);
		reprcpt.repr = ref.name;
		if(!func.repr){
			func._name = ref.name;
			var makefuncref2 = gc(env, "makeFunction", {notlocal: 1, notnew:1});
			var strcpt = docall(newcall(makefuncref2, [func]), env, 0, 1);
			func.repr = strcpt.value;
		}
		newref(funcsenv, ref.name, func);
		var strcpt = docall(newcall(makefuncref, [reprcpt, newarr(argv)]), env, 0, 1);
		repr = strcpt.value;
	}
	return repr;
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
	var refcpt = {name: key};
	refcpt.file = ns.file + "/" + key;
	refcpt.path = ns.path + "/" + key;
	refcpt.from = ns;
	refcpt._isref = 1;
//	setproto(refcpt, Ref);
	ns.ref[key] = refcpt;
	refcpt.value = ref;
	return refcpt;
}

function newarr(argarr){
	var argcpt = newcpt(rootns, "Array");
	for(var i in argarr){
		newref(argcpt, i, raw2cpt(argarr[i]));		
	}
	argcpt._length = argarr.length;
	return argcpt;
}

function newcpt(ns, proto){
	var protocpt;
	if(!proto){
		proto = "Cpt";
	}else	if(typeof proto == "string"){
		protocpt = gc(ns, proto, {notlocal: 1, initref: 1});
	}else{
		protocpt = proto;
		proto = proto.name;
	}
	var	name = "$" + (proto || "name") + (ns.nexti++);
	var cpt = rawcpt(name);
	if(!(proto in ns.ns)){
		ns.ns[proto] = {};
	}
	ns.ns[proto][name] = cpt;
	cpt.path = ns.path  + "/" + name;
	cpt.file = ns.file;
	cpt.from = ns;
	if(proto != "Cpt")
		cpt.proto[proto] = protocpt;
	cpt.global = ns.global;
	return cpt;
}


function die(){
	for(var i in arguments){
		console.error(arguments[i]);
	}
	console.error(getStackTrace());
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
function render(str, env){
// init data
	if(!env){
		die("render error not env")
	};
	var win, wout;
//		newref(mainfunc, "env", env);
	var evalstr = "arrayDump=[];push arrayDump '";
	var originstr = str.replace(/\r/g,"");
		//		str = str.
		//			replace(/\s*(\^\^[^=]((?!\$\$).)*\$\$)\s*/g, "$1");
		//replace multiple line [\s but not \n]* [^^] [not =] [not $$]* [$$] [\s*\n] 
	originstr.split(/[\t ]*\^\^(?!=)|\^\^(?==)/).forEach(function(sub, i){
		if(i==0){
			win = "";
			wout = sub || "";
		}else{
			var subs;
			if(sub[0] == '=')
				subs = sub.split(/\$\$/);
			else
				subs = sub.split(/\$\$[ \t]*/);
			win = subs[0];
			wout = subs[1] || "";
			if(!win || win[0] != '=') 
				if(wout[0] == '\n')
					wout = wout.substr(1);
		}	
		wout = wout
			.replace(/\\([\$\^])/g, "$1") //\$ \^ -> $ ^
			.replace(/\\/g, "\\\\")
//			.replace(/\n/g, "\\n");
	
		if(win && win[0] == '='){
			var ms;
			if(win[1] && win[1] == "~"){
				evalstr += (win.replace(/^=~(.+)/, "';push arrayDump &(args.$1); push arrayDump '") + wout);
			}else{
				evalstr += (win.replace(/^=(.+)/, "';push arrayDump $1; push arrayDump '") + wout);
			}
		}else{
			evalstr+=("';"+win+";push arrayDump '"+wout);
		}
	});
	evalstr+="';join arrayDump ''";
//	console.error(evalstr);
	var res = _eval(evalstr, env);

//	var res = _get(_getref(_eval(evalstr, env).value), 'value');
	return res.value;
}
