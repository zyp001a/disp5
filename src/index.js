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
	rootns.link.jsImpl = newref(rootns, "jsImpl", newcpt(rootns, "Ns"));
	userns = newref(rootns, config.user, newcpt(rootns, "Ns"));
	var env = newcpt(userns, "Env");
	if(config.gen){
		userns.link.js = newref(rootns, "js", newcpt(rootns, "Ns"));
		rootns.link.js = newref(rootns, "js", newcpt(rootns, "Ns"));
	}
	if(config.trans){
		var str = render(config.code, env);
		fs.writeFileSync(config.trans, str);
		return;
	}
	var argarr = [];
	for(var i=1; i<process.argv.length; i++){
		argarr.push(raw2cpt(userns, process.argv[i]));
	}
	var ast = parse(config.code);
	var func = analyze(userns, ast);
	var call = newcall(func, argarr);
	var result = docall(call, env);
	if(config.gen){
		gennodejs(result, config.gen);
	}
	archive();
}
function _eval(code, env){
	code = "{" + code + "}";
	var ast = parse(code);
	var func = analyze(rootns, ast);
	var result = doexec(func, env);
	return result;
}
function gc(cpt, key, config){
	if(!config) config = {};
	if(key in cpt.ref){
		return cpt.ref[key];
	}
	if(isproto(cpt, "Array") && Number(key) >=0){
		return cpt.value.value[key];
	}

	var rcpt, pns;
	var f = __dirname + "/../"+ cpt.path + "/" + key + ".mm";
	var f2 = __dirname + "/../"+ cpt.path + "/" + key + ".tpl";
	if(fs.existsSync(f2)){
		var str = fs.readFileSync(f2).toString();
		var funccpt = newcpt(cpt, "Function");
		funccpt.block = [
			newcall(gc(rootns, "render", {limit:2}), [raw2cpt(cpt, str)])
		]
		rcpt = newref(cpt, key, funccpt);
		rcpt._old = 1;
	}else if(fs.existsSync(f)){
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
function newcall(refcpt, argarr){
	if(!refcpt)
		die("wrong newcall");

	var fcpt = _getref(refcpt);

	if(!fcpt){
		console.log(refcpt)
		console.log(fcpt)
		die(refcpt.name +" is not function, use 'call *' for dynamic function");
	}

	var cpt = newcpt(rootns, "Call");
/*
	if(refcpt._new || (!isproto(fcpt, "Function") && !isproto(fcpt, "Native")) ){
		var callcpt = gc(ns, "call", {limit:2});
		var argcpt = newcpt(ns, "Array")
		argcpt.value = argarr;
		cpt.call = [_getref(callcpt), [refcpt, argcpt], callcpt];
	}else{
		cpt.call = [fcpt, argarr, refcpt];
	}
*/
	cpt.call = [fcpt, argarr, refcpt];
	setlink(cpt, fcpt);
	return cpt;
}
function analyze(ns, ast){
	var c = ast[0];
	var e = ast[1];
	var cpt;
	switch(c){

		case "_block":
		cpt = newcpt(ns, "Block");
		var arr = [];
		for(var i in e){
			var argcpt = analyze(ns, e[i]);
			arr.push(argcpt)
		}
		cpt.block = arr;
		break;

		case "_function":
		cpt = newcpt(ns, "Function");
		var arr = [];
		for(var i in e){
			var argcpt = analyze(cpt, e[i]);
			arr.push(argcpt)
		}
		cpt.block = arr;
		break;

/*
		case "_precall":
		var callcpt = analyze(ns, e);
		setparent(callcpt, gc(ns, "Precall", {limit:2}));
		callfunc(callcpt, ns);
		if(!ns.precall) ns.precall = [];
		ns.precall.push(callcpt);
		cpt = undefined;
		break;
*/
		case "_normalcall":
		var callcpt = analyze(ns, e);
		if(!isproto(callcpt, "Call")){
			cpt = newcall(gc(ns, "return", {limit:2}), [callcpt]);
		}else{
			cpt = callcpt;
		}
		break;

		case "_newcall"://action
		var fcpt = analyze(ns, e[0]);
		if(e.length > 1){

			var argarr = [];
			for(var i=1; i<e.length; i++){
				var argcpt	= analyze(ns, e[i]);	
				argarr.push(argcpt);
			}
			if(fcpt._new || 
				 (!isproto(fcpt, "Function") && !isproto(fcpt, "Native")) ){
				var callcpt = gc(ns, "call", {limit:2});
				var argcpt = newcpt(ns, "Array");
				argcpt.value = argarr;
				cpt = newcall(callcpt, [fcpt, argcpt]);
			}else{
				cpt = newcall(fcpt, argarr);
			}
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

		case "_id":
		if(e[0] == "$"){
			//Arguments
			var arg = e.substr(1);
			if(arg != ""){ //for arguments
				cpt = analyze(rootns, ['_op', 'get', ['_id', 'arguments'], ['_internal', arg]]);
			}else{
				cpt = analyze(rootns, ['_id', 'arguments']);
			}
		}else{
//set function name space
			if(ast.assignable){
				cpt = gc(ns, e, {limit:2, assignable:1});
				if(!cpt._old){
					var ncpt = newcall(gc(ns, "idAssignable", {limit:2}), [raw2cpt(ns, e)]);
					ncpt._proto = cpt;
					cpt = ncpt;
				}
			}else{
				cpt = gc(ns, e, {limit:2});
				if(!cpt._old){
					var ncpt = newcall(gc(ns, "id", {limit:2}), [raw2cpt(ns, e)]);
					ncpt._proto = cpt;
					cpt = ncpt;
				}
			}
		}

		break;

		case "_string":
		case "_number":
		cpt = newcall(gc(ns, "raw", {limit:2}), [raw2cpt(ns, e)]);
		break;

		case "_internal":
		cpt = newcpt(ns);
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
		if(e == "get"){
			setproto(left._proto, gc(rootns, "Hash", {limit:2}));
		}
		var right;
		if(ast[3]) right = analyze(ns, ast[3]);
		cpt = newcall(gc(ns, e, {
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
function printtree(env){
	for(var key in env.ns.Env){
		printtree(env.ns.Env[key])
	}
}
function gennodejs(result, config){
	var refs = result.call[0].ref;
	console.log(refs);
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
		docall: docall,
		newcall: newcall,
		render: render,
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
		return docall(arg, ns).value;
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
function doexec(func, env){
	func.cpt = [];
	var result;
	var step = _get(func, "block");
	for(var i in step){
		var scpt = step[i];
		var tmpcpt = docall(scpt, env);
		func.cpt.push(tmpcpt.value);
		result = tmpcpt;
	}
	return result;
}
function docall(cpt, env){
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

	var printstr = "";
	for(var i in argvp){	
		if(argvp[i].proto.String)
			printstr += argvp[i].path + ":" +  argvp[i].value + ",";
		else
			printstr += argvp[i].path + ",";
	}
	console.log("call:  " + env.path +" "+  tcall[2].path + "\n\t" + printstr);

	cpt.cpt = [];
	var result;
	if(isproto(func, "Native") || isproto(func, "Function")){
		var newenv = newcpt(env, "Env");
		setparent(newenv, env);
		setparent(newenv, func);

		var argcpt = newcpt(cpt, "Array");
		argcpt.value = argvp;
		newref(newenv, "arguments", argcpt);
		if(isproto(func, "Native")){
			var resultstr = callnative(newenv, func, argvp);
			if(typeof resultstr != "object")
				result = raw2cpt(cpt, resultstr);
			else
				result = resultstr;
			cpt.cpt.push(result.value);
		}else if(isproto(func, "Function")){
			var step = _get(func, "block");
			for(var i in step){
				var scpt = step[i];
				var tmpcpt = docall(scpt, newenv);
				cpt.cpt.push(tmpcpt.value);
				if(isproto(tmpcpt, "return")){
					result = tmpcpt.value;
					break;
				}else{
					result = tmpcpt;
				}
			}
		}
	}else{
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
function render(str, env){
// init data
	if(!env){
		die("render error not env")
	};
	var win, wout;
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
//			.replace(/([\[\]\{\}'])/g, "\\$1")
			.replace(/\n/g, "\\n");
		

		if(win && win[0] == '='){
			var ms;
//automatic init
/*
				if((ms=win.match(/^=([A-Za-z0-9-]+)$/)))
					if(data[ms[1]] === undefined){
						data[ms[1]] = "";
					}
*/
//eval def
/*
				if((ms=win.match(/^=~(.*)$/))){
					if(ms[1].match(/:/)){
						win = win.replace(/~(.+)/,"$.eval({$1})");
					}else{
						win = win.replace(/~(.+)/,"$.eval($1)");
					}
				}
*/
			evalstr += (win.replace(/^=(.+)/, "';push arrayDump $1; push arrayDump '") + wout);
		}else{
//eval def
/*
				if(win.match(/~$/)){
					evalstr+=("');" +win.replace(/~$/, "'")+wout+"';p.push('");
				}else{
					evalstr+=("');"+win+";p.push('"+wout);
				}
*/
			evalstr+=("';"+win+";push arrayDump '"+wout);
		}
	});
	evalstr+="';join arrayDump ''";
	var res = _get(_getref(_eval(evalstr, env).value), 'value');
	return res;
}
