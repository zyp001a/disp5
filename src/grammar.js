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
			"sp": "[ \\t]*",
			"sp2": "[ \\t\\n\\r]*"
    },
    "rules": [
			["{sp}\`(\\.|[^\\\`])*\`{sp}", 
			 "yytext = yytext.replace(/^\\s*\`/, '').replace(/\`\\s*$/, ''); return 'NATIVE';"],
			["\\/\\*[\\S\\s]*\\*\\/", "return;"],//COMMENT
			["\\#[^\\n\\r]+[\\n\\r]*", "return;"],//COMMENT
			["\\\/\\\/[^\\n\\r]+[\\n\\r]*", "return;"],//COMMENT
			["{sp}\"(\\.|[^\\\"])*\"{sp}", 
			 "yytext = yytext.replace(/^\\s*\"/, '').replace(/\"\\s*$/, ''); return 'STRING';"],
			["{sp}\'(\\.|[^\\\'])*\'{sp}",
       "yytext = yytext.replace(/^\\s*\'/, '').replace(/\'\\s*$/, ''); return 'STRING';"],
      ["{sp}{int}\\b{sp}", 
			 "yytext = yytext.replace(/\\s/g, ''); return 'INT';"],
      ["{sp}{int}{frac}?{exp}?\\b{sp}",
			 "yytext = yytext.replace(/\\s/g, ''); return 'NUMBER';"],
			["{sp}\\$?{letter}({letter}|{digit})*{sp}", 
			 "yytext = yytext.replace(/\\s/g, '');return 'ID'"],
			["{sp}\\${digit}*{sp}", 
			 "yytext = yytext.replace(/\\s/g, '');return 'ID'"],
      ["{sp}\\.{sp}", "return '.'"],
      ["{sp}\\({sp2}", "return '('"],
      ["{sp2}\\){sp}", "return ')'"],
      ["{sp}\\[{sp2}", "return '['"],
      ["{sp2}\\]{sp}", "return ']'"],
      ["{sp}\\{{sp2}", "return '{'"],
      ["{sp2}\\}{sp}", "return '}'"],
			["{sp}\\?\\={sp2}", "return '?='"],
			["{sp}\\:\\={sp2}", "return ':='"],
			["{sp}\\|\\|{sp2}", "return '||'"],
			["{sp}\\&\\&{sp2}", "return '&&'"],
//      ["{sp}\\@{sp}", "return '@'"],
//      ["{sp}\\${sp}", "return '$'"],
//      ["{sp}\\>\\>{sp2}", "return '>>'"],
      ["{sp}\\>{sp2}", "return '>'"],
      ["{sp}\\<{sp2}", "return '<'"],
      ["{sp}\\&{sp}", "return '&'"],
      ["{sp}\\|{sp}", "return '|'"],
			["{sp}\\!{sp}", "return '!'"],
			["{sp}={sp}", "return '='"],
			["{sp}\\+{sp2}", "return '+'"],
			["{sp}\\-{sp2}", "return '-'"],
			["{sp}\\*{sp2}", "return '*'"],
			["{sp}\\/{sp2}", "return '/'"],
			["{sp}\\%{sp}", "return '%'"],
			["{sp}\\^{sp}", "return '^'"],
			["{sp}\\.{sp2}", "return '.'"],
			["{sp}\\:{sp2}", "return ':'"],
      ["{sp},{sp2}", "return ','"],
      ["{sp}\\~{sp2}", "return '~'"],
			["{sp}\\_{sp}", "return '_'"],
      ["{sp}[\\r\\n;]+{sp}", "return ';'"]
    ]
  },
	"operators": [
		["left", "~"],
    ["right", "=", "+=", "-=", "*=", "/=", "?=", ":="],
		["left", ","],
    ["left", "||"],
    ["left", "&&"],
    ["left", "+", "-"],
    ["left", "*", "/", "%"],
    ["right", "&"],
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
			["INT", "$$ = ['number', Number(yytext), 'int']"],
			["NUMBER", "$$ = ['number', Number(yytext)]"]
		],
		"Ls": [
			["L", "$$ = [$1]"], //pharse
			["Ls L", "$$ = $1; $1.push($2)"]
		],
		"Lss": [
			["Ls", "$$ = $1"],
			["Lss ExpUnit", "$$ = $1; $1.push($2)"]
		],
		"ExpList": [
			["Exp",  "$$ = ['exps', [$1]];"],  //artical
			["; Exp",  "$$ = ['exps', [$2]];"],
			["ExpList ; Exp", "$$ = $1; $1[1].push($3);"],
			["ExpList ;", "$$ = $1;"],
			[";", "$$ = ['exps', []];"]
		],
		"Exp": [//sentence
			["Lss", "$$ = ['pharse', $1]"], 			
			["ExpUnit", "$$ = ['pharse', [$1]]"], 
			["ID := ExpUnit", "$$ = ['define', $1, $3]"],
			["& Exp", "$$ = ['op', 'ref', $2]"],
			["! Exp", "$$ = ['op', 'not', $2]"],
			["Exp = Exp", "$$ = ['op', 'assign', $1, $3]"],
			["Exp ~ Exp", "$$ = ['op', 'extend', $1, $3]"],
			["Exp . Exp", "$$ = ['op', 'getkey', $1, $3]"],
			["Exp + Exp", "$$ = ['op', 'plus', $1, $3]"],
			["Exp - Exp", "$$ = ['op', 'minus', $1, $3]"],
			["Exp ?= Exp", "$$ = ['op', 'assignifnull', $1, $3]"]
		],
		"ExpUnit": [
			["( Exp )", "$$ = $2"],
			["[ Array ]", "$$ = $2"],
			["[ Dic ]", "$$ = $2"],
			["{ ExpList }", "$$ = ['function', $2]"],
			["NATIVE", "$$ = ['function', ['exps', [['native', $1]]], 'native']"]
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

