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
			["{sp}\\=\\~{sp2}", "return '=~'"],
			["{sp}\\=\\?{sp2}", "return '=?'"],
			["{sp}\\=\\:{sp2}", "return '=:'"],
			["{sp}\\=\\>{sp2}", "return '=>'"],
			["{sp}\\-\\>{sp2}", "return '->'"],
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
    ["right", "=", "+=", "-=", "*=", "/=", "=?", "=:", "=>", "->"],
		["left", "<", ">", "=>", "<=", "=="],
		["left", "=~"],
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
			["Native", "return $$ = $1"],
			["ExpList", "return $$ = ['_newobj', $1, 'Function']"]
		],
		"Native": [
			["NATIVE", "$$ = ['_native', $1]"]
		],
		"L": [
			["ID", "$$ = ['_id', yytext]"], //word
			["@ ID", "$$ = ['_id', $2, 'local']"], //word
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
			["Exp",  "$$ = [$1];"],  //artical
			["; Exp",  "$$ = [$2];"],
			["ExpList ; Exp", "$$ = $1; $1.push($3);"],
			["ExpList ;", "$$ = $1;"],
			[";", "$$ = [];"]
		],
		"Exp": [//sentence
			["ExpUnit", "$$ = ['_phrase', [$1]]"],
			["Lss", "$$ = ['_phrase', $1]"],
			["Lss Precall", "$$ = ['_phrase', $1, $2]"],
			["Op", "$$ = $1"]
		],
		"Op": [
			["! Exp", "$$ = ['_op', 'not', $2]"],
			["& Exp", "$$ = ['_op', 'getres', $2]"],
			["Exp = Exp", "$$ = ['_op', 'assign', $1, $3]"],
			["Exp = Native", "$$ = ['_op', 'assign', $1, $3]"],
			["Exp . Exp", "$$ = ['_op', 'get', $1, $3]"],
			["Exp + Exp", "$$ = ['_op', 'plus', $1, $3]"],
			["Exp - Exp", "$$ = ['_op', 'minus', $1, $3]"],
			["Exp < Exp", "$$ = ['_op', 'less', $1, $3]"],
			["Exp =~ Exp", "$$ = ['_op', 'match', $1, $3]"],
			["Exp =? Exp", "$$ = ['_op', 'default', $1, $3]"],
			["Exp =: Exp", "$$ = ['_op', 'proto', $1, $3]"],
			["Exp => Exp", "$$ = ['_op', 'parent', $1, $3]"],
			["Exp -> Exp", "$$ = ['_op', 'link', $1, $3]"]
		],
		"ExpUnit": [
			["( Exp )", "$$ = $2"],
			["{ ExpList }", "$$ = ['_newcpt', $2, 'Function']"],
			["{ }", "$$ = ['_newcpt', [], 'Function']"],
			[": { ExpList }", "$$ = ['newcpt', $2, 'Obj']"]
		],
		"Precall": [
			["[ ExpList ]", "$$ = ['_precall', $2]"],
			["[ ]", "$$ = ['_precall', []]"]
		]
/*
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
*/
  }
};
var options = {};
var code = new jison.Generator(grammar, options).generate();
fs.writeFileSync(__dirname + '/parser.js', code);

