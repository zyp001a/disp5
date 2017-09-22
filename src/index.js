var version = "5.0.0";
var fs = require("fs");
var path = require("path");
var parser = require("./parser");

var gcpath = ["custom", "rootns"];
var rootns = rawcpt("rootns");
//var Ref = rawcpt("Ref");
rootns._isroot = 1;
rootns.file = "";
rootns.path = "";
newref(rootns, "global", rootns);
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
	var ast = parse(config.code);
	if(config.trans){
		var str = render(config.code, rootns);
		console.error("write: "+config.outfile)
		fs.writeFileSync(config.outfile, str);
		return;
	}
	var tree, mount, arch;
	if(config.gen){
		mount = gc(rootns, "mount", {initref:1});
		mount.value.file = config.mount;
		arch = _getref(gc(rootns, config.arch, {notlocal: 1}));
		var pre = gc(arch, "pre");
		tree = gc(arch, "tree");
		docall(newcall(pre), rootns);
		newref(rootns, "pseudo")
	}
//make argcpt
	var argcpt = newcpt(rootns, "Array");
	var argarr = [];
	for(var i=1; i<process.argv.length; i++){
		var subargcpt = raw2cpt(process.argv[i]);
//newcall(gc(rootns, "raw", {notlocal: 1}), [raw2cpt(process.argv[i])]);
		argarr.push(subargcpt);
	}
	argcpt.value = argarr;

//make main
	var mainfunc = analyze(rootns, ast, 1);
	var maincpt = newref(rootns, "main", mainfunc);
//call
	var call = newcall(gc(rootns, "call", {notlocal: 1}), [maincpt, argcpt]);
	var result = docall(call, rootns);
// gen
	if(config.gen){
//		console.log(pseudomain)
		docall(newcall(tree), rootns);
		for(var f in mount.value.ref){
			var fcpt = mount.value.ref[f];
			if(!fs.existsSync(fcpt.file))
				mkdirpSync(path.dirname(fcpt.file))
			console.error("write: "+fcpt.file)
			fs.writeFileSync(fcpt.file, fcpt.value.value)
		}
	}
}
function pseudocall(tcall, env){
	var newenv = newcpt(env);
  newref(newenv, "pseudo");
	docall(tcall, newenv);
	return newenv.ns.Env.$Env0;
}
function _eval(code, env){
	code = "{" + code + "}";
	var ast = parse(code);
	var func = analyze(rootns, ast);
	var currenv = newcpt(rootns);
	if(env.ref.args)
		currenv.ref.args = env.ref.args
	newref(currenv, "env", env);
	var result = doexec(func, currenv);
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
	if(!config) config = {};
	if(!history) history = {};
	var vcpt = _getref(cpt);
	if(!vcpt) {
		console.error(cpt)
		console.error(vcpt)
		die("gc: cpt null ref, "+key)
	}
	if(history[vcpt.path])
		return;
	if(key in vcpt.ref){
		return vcpt.ref[key];
	}
//Array return by value
	if((isproto(vcpt, "Array") || isproto(vcpt, "String")) && Number(key) >=0){
		return vcpt.value[key];
	}
	var rcpt, pns;
	for(var gcpathi in gcpath){
		var gcpathe = gcpath[gcpathi];
		var f = __dirname + "/../"+ gcpathe + vcpt.file + "/" + key;
		if(fs.existsSync(f+".mm")){
			var str = fs.readFileSync(f+".mm").toString();
			var ast = parse(str);
			var func;
			if(ast)
				func = analyze(vcpt.from, ast);
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
				newcall(gc(rootns, "render", {notlocal: 1}), [raw2cpt(str), analyze(rootns, ['_id', "$0"])])
//			newcall(gc(rootns, "render", {notlocal: 1}), [raw2cpt(vcpt, str)])
			]
			rcpt = newref(vcpt, key, funccpt);
			rcpt._old = 1;
		}else if(fs.existsSync(f+".str")){
			var str = fs.readFileSync(f+".str").toString();
			rcpt = raw2cpt(str);
		}
	}
	if(!config.notlocal){//local
		if(rcpt || config.notnew) return rcpt;
		rcpt = newref(vcpt, key);
		if(config.initref){
			rcpt.value = newcpt(vcpt)
			rcpt.value.file = vcpt.file +"/" + key
		}
		return rcpt;
	}

//record vcpt into history
	history[vcpt.path] = 1;
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
	if(!rcpt){
		for(var p in vcpt.proto){
			rcpt = gc(vcpt.proto[p], key, {
				notlocal: 1,
				notnew: 1
			}, history);
			if(rcpt)
				break;
		}
	}
	if(config.notnew)
		return rcpt;

	if(!rcpt){
		rcpt = newref(rootns, key);
		if(config.initref){
			rcpt.value = newcpt(rootns)
			rcpt.value.file = rootns.file +"/" + key
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
		return strcpt;
	}
	if(typeof raw == "number"){
		var strcpt = newcpt(rootns, "Number");
		strcpt.value = raw;
		return strcpt;
	}
	if(typeof raw == "boolean"){
		var strcpt = newcpt(rootns, "Boolean");
		strcpt.value = raw;
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
		die("wrong newcall");
	}

	var fcpt = _getref(refcpt);

	if(!fcpt){
		console.error(refcpt.name)
		console.error(fcpt)
		die(refcpt.name +" is not function, use 'call *' for dynamic function");
	}
	var cpt = newcpt(rootns, "Call");
	cpt.call = [fcpt, argarr, refcpt];
	setlink(cpt, fcpt);
	return cpt;
}
function analyze(ns, ast, mainflag){

	var c = ast[0];
	var e = ast[1];
	var cpt;
	switch(c){

//make at analysis
		case "_block":
		var proto = ast[2] || "Hash";
		cpt = newcpt(ns, proto);
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
		if(mainflag) cpt._main = 1;
		var makefunc = gc(ns, "make"+proto, {notlocal: 1, notnew:1});
		if(makefunc){
			var strcpt = docall(newcall(makefunc, [cpt]), rootenv).value;
			if(strcpt){
				cpt.value = strcpt.value;
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
// broke return mechnism
//		cpt = newcall(gc(ns, "raw", {notlocal: 1}), [raw2cpt(e)]);
		break;

		case "_native":
		cpt = newcpt(ns, "Native");
		cpt.value = e;
		break;

		case "_array":
		cpt = newcpt(ns, "Array");
		cpt.value = [];
		for(var i in e){
			cpt.value.push(analyze(ns, e[i]));
		}
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
		}else{
			cpt = callcpt;
		}
		break;

		case "_newcall"://action
		var fcpt = analyze(ns, e[0]);
		if(e.length > 1){
//			if(assignablelist[fcpt.name]){
//				e[1].assignable = 1;
//			}
			var argarr = [];
			for(var i=1; i<e.length; i++){
				var argcpt	= analyze(ns, e[i]);
				argarr.push(argcpt);
			}
			if(fcpt._new || 
				 (!isproto(fcpt, "Function") && !isproto(fcpt, "Native")) ){
//user defined function
				var callcpt = gc(ns, "call", {notlocal: 1});
				var argcpt = newcpt(ns, "Array");
				argcpt.value = argarr;
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
		}else{
			die("error, newcall")
			cpt = fcpt;
		}
		break;

		case "_getid":
		cpt = newcall(gc(ns, "id", {notlocal: 1}), [analyze(ns, e)]);
		break;

		case "_id":
//set function name space
		cpt = gc(ns, e, {notlocal: 1});
		if(!cpt._old){
			cpt = newcall(gc(ns, "id", {notlocal: 1}), [raw2cpt(e)]);
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
function callnative(env, func, argvp){
	var v = func.value;
	var ns = {
		assign: assign,
		setproto: setproto,
		setparent: setparent,
		isproto: isproto,
		docall: docall,
		newcall: newcall,
		render: render,
//		gen: gen,
		gc: gc,
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
//	console.log(v)
	var result;
	try{
		with(ns){
			result = eval("(function(){"+v+"})()");
		}
	}catch(err){
//		console.error(ns.$);
//		console.error(func);
		console.error(v);
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
		return docall(arg, ns).value;
	}else if(isproto(arg, "Array")){
		var res = newcpt(arg, "Array");
		res.value = [];
		for(var j in arg.value){
			res.value[j] = procarg(arg.value[j], ns);
		}
		res._origin = arg;
		return res;
	}else{
		return arg;
	}	
}
function doexec(funcref, env){
	var func = _getref(funcref);
	func.cpt = [];
	var result;
	var step = _get(func, "block");
	for(var i in step){
		var scpt = step[i];
		var tmpcpt = docall(scpt, env);
		func.cpt.push(tmpcpt.value);
		result = tmpcpt;
		
		if(tmpcpt.value.name == "break" || tmpcpt.value.name == "continue"){
			return result;
		}
	}
	return result;
}
function docall(cpt, env){
	var tcall = _get(cpt, "call");
	if(!tcall){
		console.error(cpt)
		die("wrong call")
	}
	var pseudo = gc(env, "pseudo", {notlocal:1, notnew:1})

	var func = tcall[0];
		
	if(pseudo && func._pseudo){
		func = func._pseudo;
	}

	var argv = tcall[1];
	var argvp = [];
	for(var i in argv){
		argvp[i] = procarg(argv[i], env);
	}
//	setparent(env, func);

	var printstr = "";
	for(var i in argvp){	
		if(isproto(argvp[i], "String"))
			printstr += argvp[i].path + ":" +  argvp[i].value + ",";
		else
			printstr += argvp[i].path + ",";
	}
	console.error(tcall[2].name, ": "+printstr);
	cpt.cpt = [];
	var result;
	if(isproto(func, "Function") || isproto(func, "Native")){
		var newenv = newcpt(env, "Env");
		setparent(newenv, env);
		setparent(newenv, func);

		var argcpt = newcpt(cpt, "Array");
		argcpt.value = argvp;
		newref(newenv, 'args', argcpt);
		newref(newenv, "func", func);
		
		if(isproto(func, "Native")){
			var resultstr = callnative(newenv, func, argvp);
			if(typeof resultstr != "object")
				result = raw2cpt(resultstr);
			else
				result = resultstr;
			cpt.cpt.push(result.value);
		}else if(isproto(func, "Function")){
			var step = _get(func, "block");
			for(var i in step){
				var scpt = step[i];
				var tmpcpt = docall(scpt, newenv);
				cpt.cpt.push(tmpcpt.value);
				if(tmpcpt.call[2].name == "return"){
					result = tmpcpt.value;
  				break;
				}else{
					result = tmpcpt;
				}
			}
			if(!result) result = raw2cpt(cpt)
		}
	}else{
		console.error(func)
		die("not Function or Native")
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
//	newref(cpt, "self", cpt)
	if(proto != "Cpt")
		cpt.proto[proto] = protocpt;
//	if(proto == "Function" || proto == "Ns")
	return cpt;
}

function cpt2str(cpt){
	return "";
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
			evalstr += (win.replace(/^=(.+)/, "';push arrayDump $1; push arrayDump '") + wout);
		}else{
			evalstr+=("';"+win+";push arrayDump '"+wout);
		}
	});
	evalstr+="';join arrayDump ''";
	var res = _get(_getref(_eval(evalstr, env).value), 'value');
	return res;
}
