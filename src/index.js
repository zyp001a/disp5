var version = "5.0.0";
var parser = require("./parser");
module.exports = function(env, fn){
	console.log("#Disp version: "+ version);
	extendenv(env);
	parse(env);
	analyze(env);
	dump(env);
	gen(env);
}

function extendenv(env){
	
}
function parse(env){
	env.ast = parser.parse(env.src);
	console.log(env.ast);
}
function analyze(env, ast){
	if(!ast) ast = env.ast;
	var c = ast[0];
	var e = ast[1];
	switch(c){
		case "exps":
		for(var i in e){
			analyze(env, e[i]);
		}
		break;
		case "phase":
		
		break;
		default:
		console.log(ast)
	}
}
function dump(env){
}
function gen(env){
}
