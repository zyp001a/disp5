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
			["{sp}\"(\\.|[^\\\"])*\"{sp}", 
			 "yytext = yytext.replace(/^\\s*\"/, '').replace(/\"\\s*$/, ''); return 'STRING';"],
			["{sp}\'(\\.|[^\\\'])*\'{sp}",
       "yytext = yytext.replace(/^\\s*\'/, '').replace(/\'\\s*$/, ''); return 'STRING';"],
			["\\/\\*[\\S\\s]*\\*\\/", "return;"],//COMMENT
			["\\#[^\\n\\r]+[\\n\\r]*", "return;"],//COMMENT
			["\\\/\\\/[^\\n\\r]+[\\n\\r]*", "return;"],//COMMENT
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
      ["{sp}\\%\\[{sp2}", "return '%['"],
      ["{sp2}\\}{sp}", "return '}'"],
			["{sp}\\?\\={sp2}", "return '?='"],
			["{sp}\\:\\={sp2}", "return ':='"],
			["{sp}\\|\\|{sp2}", "return '||'"],
			["{sp}\\&\\&{sp2}", "return '&&'"],
//      ["{sp}\\${sp}", "return '$'"],
//      ["{sp}\\>\\>{sp2}", "return '>>'"],
      ["{sp}\\>{sp2}", "return '>'"],
      ["{sp}\\<{sp2}", "return '<'"],
      ["{sp}\\&{sp}", "return '&'"],
      ["{sp}\\@{sp}", "return '@'"],
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
    ["right", "=", "+=", "-=", "*=", "/=", "?=", ":=", ">", "<"],
		["left", ","],
    ["left", "||"],
    ["left", "&&"],
    ["left", "+", "-"],
    ["left", "*", "/", "%"],
    ["right", "&", "|", "@", "~", "%"],
    ["right", "!"],
		["left", "."],
		["left", ":"]
	],
  "start": "Block",
  "bnf": {
		"Block": [
			["@ NATIVE", "return $$ = ['_native', $2]"],
			["ExpList", "return $$ = $1"]
		],
		"L": [
			["ID", "$$ = ['_id', yytext]"], //word
			["STRING", "$$ = ['_string', yytext]"],
			["NUMBER", "$$ = ['_number', Number(yytext)]"]
		],
		"Ls": [
			["L", "$$ = [$1]"], //phrase
			["Ls L", "$$ = $1; $1.push($2)"]
		],
		"Lss": [
			["Ls", "$$ = $1"],
			["Lss ExpUnit", "$$ = $1; $1.push($2)"]
		],
		"ExpList": [
			["Exp",  "$$ = ['_function', [$1]];"],  //artical
			["; Exp",  "$$ = ['_function', [$2]];"],
			["ExpList ; Exp", "$$ = $1; $1[1].push($3);"],
			["ExpList ;", "$$ = $1;"],
			[";", "$$ = ['_function', []];"]
		],
		"Exp": [//sentence
			["ExpUnit", "$$ = ['_phrase', [$1]]"],
			["Lss", "$$ = ['_phrase', $1]"],
			["Op", "$$ = $1"],
			["NATIVE", "$$ = ['_native', $1]"]
		],
		"Op": [
			["| Exp", "$$ = ['_op', 'ref', $2]"],
			["! Exp", "$$ = ['_op', 'not', $2]"],
			["& Exp", "$$ = ['_op', 'getv', $2]"],
			["Exp := Exp", "$$ = ['_op', 'define', $1, $3]"],
			["Exp = Exp", "$$ = ['_op', 'assign', $1, $3]"],
			["Exp ~ Exp", "$$ = ['_op', 'extend', $1, $3]"],
			["Exp . Exp", "$$ = ['_op', 'getkey', $1, $3]"],
			["Exp + Exp", "$$ = ['_op', 'plus', $1, $3]"],
			["Exp - Exp", "$$ = ['_op', 'minus', $1, $3]"],
			["Exp < Exp", "$$ = ['_op', 'less', $1, $3]"],
			["Exp ?= Exp", "$$ = ['_op', 'assignifnull', $1, $3]"]
		],
		"ExpUnit": [
			["( Exp )", "$$ = $2"],
			["[ Array ]", "$$ = ['_array', $2]"],
			["[ ]", "$$ = ['_array', []]"],
			["{ ExpList }", "$$ = $2"]
		],
 		"Array": [
			["Exp", "$$ = [$1]"],
			["Array , Exp", "$$ = $1, $1.push($3)"]
		],
		"Prop": [
			["L : ", "$$ = $1"],
			["( Exp ) :", "$$ = $2"]
		],
		"Dic": [
			["Exp", "$$ = [$1]"],
			["Prop Exp", "$$ = [['prop', $1, $2]]"],
			["Dic , Exp", "$$ = $1, $1.push($3)"],
			["Dic , Prop Exp", "$$ = $1, $1.push(['prop', $3, $4])"]
		]
  }
};
var options = {};
var code = new jison.Generator(grammar, options).generate();
fs.writeFileSync(__dirname + '/parser.js', code);

