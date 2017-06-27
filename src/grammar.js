var jison = require("jison");
var fs = require("fs");
var grammar = {
  "lex": {
    "macros": {
      "digit": "[0-9]",
			"letter": "[a-zA-Z_]",
      "esc": "\\\\",
      "int": "-?(?:[0-9]|[1-9][0-9]+)",
      "exp": "(?:[eE][-+]?[0-9]+)",
      "frac": "(?:\\.[0-9]+)",
			"sp": "[ \\t]*"
    },
    "rules": [
			["\\/\\*[\\S\\s]*\\*\\/", "return;"],//COMMENT
			["\\#[^\\n\\r]+[\\n\\r]*", "return;"],//COMMENT
			["\\\/\\\/[^\\n\\r]+[\\n\\r]*", "return;"],//COMMENT
			["{sp}\"(\\.|[^\\\"])*\"{sp}", 
			 "yytext = yytext.replace(/^\\s*\"/, '').replace(/\"\\s*$/, ''); return 'STRING';"],
			["{sp}\'(\\.|[^\\\'])*\'{sp}",
       "yytext = yytext.replace(/^\\s*\'/, '').replace(/\'\\s*$/, ''); return 'STRING';"],
      ["{sp}[\\t\\n;]+{sp}", "return ';'"],
      ["{sp}{int}\\b{sp}", 
			 "yytext = yytext.replace(/\\s/g, ''); return 'INT';"],
      ["{sp}{int}{frac}?{exp}?\\b{sp}",
			 "yytext = yytext.replace(/\\s/g, ''); return 'NUMBER';"],
			["{sp}\\$?{letter}({letter}|{digit})*{sp}", 
			 "yytext = yytext.replace(/\\s/g, '');return 'ID'"],
			["{sp}\\${digit}*{sp}", 
			 "yytext = yytext.replace(/\\s/g, '');return 'ID'"],
      ["{sp}\\.{sp}", "return '.'"],
      ["{sp}\\({sp}", "return '('"],
      ["{sp}\\){sp}", "return ')'"],
      ["{sp}\\[{sp}", "return '['"],
      ["{sp}\\]{sp}", "return ']'"],
      ["{sp}\\{{sp}", "return '{'"],
      ["{sp}\\}{sp}", "return '}'"],
			["{sp}\\?\\={sp}", "return '?='"],
			["{sp}\\|\\|{sp}", "return '||'"],
			["{sp}\\&\\&{sp}", "return '&&'"],
//      ["{sp}\\&{sp}", "return '&'"],
//      ["{sp}\\@{sp}", "return '@'"],
//      ["{sp}\\${sp}", "return '$'"],
      ["{sp}\\>\\>{sp}", "return '>>'"],
      ["{sp}\\>{sp}", "return '>'"],
      ["{sp}\\<{sp}", "return '<'"],
      ["{sp}\\|{sp}", "return '|'"],
			["{sp}\\!{sp}", "return '!'"],
			["{sp}={sp}", "return '='"],
			["{sp}\\+{sp}", "return '+'"],
			["{sp}\\-{sp}", "return '-'"],
			["{sp}\\*{sp}", "return '*'"],
			["{sp}\\/{sp}", "return '/'"],
			["{sp}\\%{sp}", "return '%'"],
			["{sp}\\^{sp}", "return '^'"],
			["{sp}\\+{sp}", "return '+'"],
			["{sp}\\.{sp}", "return '.'"],
			["{sp}\\:{sp}", "return ':'"],
      ["{sp},{sp}", "return ','"],
      ["{sp}\\~{sp}", "return '~'"],
			["{sp}\\_{sp}", "return '_'"]
    ]
  },
	"operators": [
    ["right", "=", "+=", "-=", "*=", "/=", "?="],
		["left", ","],
    ["left", "||"],
    ["left", "&&"],
    ["left", "+", "-"],
    ["left", "*", "/", "%"],
    ["right", "!"],
		["left", "."],
		["left", ":"]
	],
  "start": "Block",
  "bnf": {
		"Block": [["ExpList", "return $$ = $1"]],
		"L": [
			["ID", "$$ = ['id', yytext]"], //word
			["STRING", "$$ = ['string', yytext]"],
			["INT", "$$ = ['num', Number(yytext), 'int']"],
			["NUMBER", "$$ = ['num', Number(yytext)]"]
		],
		"Ls": [["L", "$$ = [$1]"], //phase
					 ["Ls L", "$$ = $1; $1.push($2)"]
					],
		"ExpList": [
			["Exp",  "$$ = ['exps', [$1]];"],  //artical
			["; Exp",  "$$ = ['exps', [$2]];"],
			["ExpList ; Exp", "$$ = $1; $1[1].push($3);"],
			["ExpList ;", "$$ = $1;"],
			[";", "$$ = ['exps', []];"]
		],
		"Exp": [//sentence
			["Ls", "$$ = ['pharse', $1]"], 			
			["ExpUnit", "$$ = ['pharse', $1]"], 
			["Exp + Exp", "$$ = ['op', 'plus', $1, $3]"],
			["Exp - Exp", "$$ = ['op', 'minus', $1, $3]"],
			["Exp ?= Exp", "$$ = ['op', 'assignifnull', $1, $3]"]
		],
		"ExpUnit": [
			["( Exp )", "$$ = $2"],
			["[ Array ]", "$$ = $2"],
			["[ Dic ]", "$$ = $2"],
			["{ ExpList }", "$$ = $2"]
		],
		"Array": [
			["Exp", "$$ = ['array', [$1]]"],
			["Array , Exp", "$$ = $1, $1[1].push($3)"]
		],
		"Dic": [
			["Exp : Exp", "$$ = ['dic', [[$1, $3]]]"],
			["Dic , Exp : Exp", "$$ = $1, $1[1].push([$3, $5])"]			
		]
  }
};
var options = {};
var code = new jison.Generator(grammar, options).generate();
fs.writeFileSync(__dirname + '/parser.js', code);

