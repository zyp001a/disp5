var version = "5.0.0";
var fs = require("fs");
var path = require("path");
var parser = require("./parser");
var tmpl = require("./tmpl");
module.exports = function(env, fn){
	console.log("#Disp version: "+ version);
	extendenv(env);
	parse(env);
	console.log(env.ast);
	analyze(env);
	gen(env);
	archieve(env);
}

function extendenv(env){
	if(!env.searchpath) env.searchpath = ["d", "db"];
	if(!env.ns) env.ns = {};
	if(!env.tplcache) env.tplcache = {};
	if(!env.history) env.history = [];
	if(!env.arg) env.arg = [];//TODO

}
function parse(env){
	env.ast = parser.parse(env.src);
}
function analyze(env, ast, arg){
	if(!ast) ast = env.ast;
	if(!arg) arg = env.arg;
	var c = ast[0];
	var e = ast[1];
	var cpt;
	switch(c){
		case "exps":
		for(var i in e){
			cpt = analyze(env, e[i], arg);
		}
		break;

		case "phrase":
		var fcpt = analyze(env, e[0], arg);
		if(fcpt.proto.name == "function"){
			if(!env.outlang){
				cpt = analyze(env, fcpt.value, newarg(env, e, arg));//run function
			}else{				
				cpt = newcpt(env);
				cpt.proto = cacheget(env, "call");
				cpt.value = [];
				cpt.value[0] = fcpt;
				cpt.value[1] = newarg(env, e, arg);
				env.history.push(cpt);
			}
		}else{
			cpt = fcpt;
		}
		break;

		case "op":
		var left = analyze(env, ast[2], arg);
		var right;
		if(ast[3]) right = analyze(env, ast[3], arg);
		cpt = op(env, e, left, right); 
		break;

		case "id":
		cpt = cacheget(env, e);
		break;

		case "string":
		cpt = newcpt(env);
		cpt.proto = cacheget(env, "string");
		cpt.value = e;
		break;

		case "number":
		cpt = newcpt(env);
		cpt.proto = cacheget(env, "number");
		cpt.value = e;
		break;

		case "function":
		cpt = newcpt(env);
		cpt.proto = cacheget(env, "function");
//		if(ast[2] == "native")
//			cpt.proto.native = cacheget(env, "native");
		cpt.value = e;//TODO type check
		break;

		case "native":
		if(env.outlang){
			console.log(arg);
			die("no implementation for " + env.outlang);
		}
		var newenv = {};
		for(var key in arg.value){
			var a = arg.value[key];
			newenv["$$"+key] = a;
			newenv["$"+key] = a.value;
		}
		newenv.sys = module.exports;
		newenv.env = env;
		var result;
		try{
			with(newenv){
				result = eval("(function(){"+ast[1]+"})()");
			}
		}catch(err){
			console.log(newenv);
			console.log(ast[1]);
			die( "error");
		}
		if(result == undefined) result = "";
		cpt = str2cpt(env, result);
		break;

		case "define":
		cpt = analyze(env, ast[2], arg);
		cpt.leaf = 1;
		cpt.name = e;
		cacheset(env, e, cpt);
		break;

		case "dic":
		cpt = newcpt(env);
		cpt.proto = cacheget(env, "dic");
		cpt.value = {};
		for(var i in e){
			var kv = e[i];
			var cptk= analyze(env, kv[0], arg);
			var key, val;
			if(cptk.leaf)
				key = cptk.name;
			else
				key = cptk.value;
			if(cptk.name)
				cpt.link[cptk.name] = cptk;
			var cptv= analyze(env, kv[1], arg);
			val = cptv.value;
			if(cptv.name)
				cpt.link[cptv.name] = cptv;
			cpt.value[key] = val;
		}
		break;

		default:
		console.log(ast);
	}
	ast.cpt = cpt;
	return cpt;
}
function op(env, op, left, right){
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
function archieve(env){
}
function run(env, cpt, args){	
	
}
function gen(env){
	if(!env.outlang) return;
	console.log(env.ns);
	console.log(env.history);
	for(var i in env.history){
		var s = env.history[i];
		var tplstr = s.proto.tpl[env.outlang];
		console.log(tmpl.render(tplstr));
	}
}
function loadtpl(env, name){
	var key = name + "/" + env.outlang;

	if(env.tplcache[key]) 
		return env.tplcache[key];
	var got;
	for(var i in env.searchpath){
		var sp = env.searchpath[i];
		var f = __dirname + "/../" + sp + "/"+ key + ".t";
		if(fs.existsSync(f)){
			got = fs.readFileSync(f).toString();			
			break;
		}
	}
	env.tplcache[key] = got;
	return got;
}
function newcpt(env, key){
	return {
		name: key,
		link: {},
		tpl: {}
	}
}
function newarg(env, arr, parg){
	var cpt = newcpt(env);
	cpt.proto = cacheget(env, "argv");
	cpt.parent = parg;
	var arra = [];
	for(var i=1; i<arr.length; i++){		
		arra[i] = analyze(env, arr[i], parg);
	}
	cpt.value = arra;
	return cpt;
}
function cacheset(env, key, cpt){
	env.ns[key] = cpt;
}
function cacheget(env, key){
	if(env.ns[key]) return env.ns[key];
	var precached = env.ns[key] = {};
	var got;
	for(var i in env.searchpath){
		var sp = env.searchpath[i];
		var f = __dirname + "/../" + sp + "/"+ key + ".d";
		if(fs.existsSync(f)){
			var str = fs.readFileSync(f).toString();
			got = str2cpt(env, str);
			break;
		}
	}
	if(!got) got = newcpt(env, key);
	if(env.outlang){
		var tplstr = loadtpl(env, key);
		if(tplstr != undefined)
			got.tpl[env.outlang] = tplstr;
	}
	for(var subkey in got)
		precached[subkey] = got[subkey];
	return got;
}



function str2cpt(env, str){
	if(str == "") return cacheget(env, "null");
	return analyze(env, parser.parse(str));
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
