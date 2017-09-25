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
      ["{sp}\\\\[\\r\\n;]+{sp}", "return"],//allow \ at end of line
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
			["{sp}\\>\\={sp2}", "return '>='"],
			["{sp}\\<\\={sp2}", "return '<='"],
			["{sp}\\=\\={sp2}", "return '=='"],
			["{sp}\\!\\={sp2}", "return '!='"],
			["{sp}\\+\\={sp2}", "return '+='"],
			["{sp}\\-\\={sp2}", "return '-='"],
			["{sp}\\*\\={sp2}", "return '*='"],
			["{sp}\\/\\={sp2}", "return '/='"],
			["{sp}\\|\\|{sp2}", "return '||'"],
			["{sp}\\&\\&{sp2}", "return '&&'"],
			["{sp}\\:\\:{sp2}", "return '::'"],
			["{sp}\\:\\={sp2}", "return ':='"],
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
    ["right", "=", "+=", "-=", "*=", "/=", ":="],
//		["left", "=?", "=:", "=>", "->"],
		["left", "<", ">", ">=", "<=", "==", "!="],
		["left", "=~"],
		["left", ","],
    ["left", "||"],
    ["left", "&&"],
    ["left", "+", "-"],
    ["left", "*", "/", "%"],
    ["right", "&", "|", "@", "~", "%"],
    ["right", "!"],
		["left", ".", ":"]
	],
  "start": "Block",
  "bnf": {
		"Block": [
//			["Native", "return $$ = $1"],
//			["ExpUnit", "return $$ = $1"]
			["Exp", "return $$ = $1"],
			["Exp ;", "return $$ = $1"]
//			["ExpList", "return $$ = ['_newcpt', $1, 'Function']"]
		],
		"Native": [
			["NATIVE", "$$ = ['_native', $1]"]
		],
		"Id": [
			["ID", "$$ = ['_id', $1]"],
			["@ ID", "$$ = ['_local', $2]"],
			["^ ( Exp )", "$$ = ['_getid', $3]"],
			["^ STRING", "$$ = ['_getid', ['_string', $2]]"]
		],
		"L": [//word
			["Id", "$$ = $1"],
			["STRING", "$$ = ['_string', $1]"],
			["NUMBER", "$$ = ['_number', Number($1)]"],
			["& Id", "$$ = ['_getrepr', $2]"],
			["& ( Exp )", "$$ = ['_getrepr', $3]"]
		],
		"Lss": [
			["L", "$$ = [$1]"], //newcall
			["Lss GetOp", "$$ = $1; $1.push($2);"],
			["Lss L", "$$ = $1; $1.push($2)"],
			["Lss ExpUnit", "$$ = $1; $1.push($2)"],
			["Lss ( Exp )", "$$ = $1; $1.push($3)"]
		],
		"Key": [
			["ID", "$$ = ['_string', $1]"],
			["STRING", "$$ = ['_string', $1]"],
			["NUMBER", "$$ = ['_number', $1]"],
			["( Exp )", "$$ = $2"]
		],
		"GetOp": [
			["Id . Key", "$$ = ['_newcall', [['_id', 'get'], $1, $3]]"],
			["( Exp ) . Key", "$$ = ['_newcall', [['_id', 'get'], $2, $4]]"],
			["GetOp . Key", "$$ = ['_newcall', [['_id', 'get'], $1, $3]]"]
		],
/*
		"Lss": [
			["Ls", "$$ = $1"],
			["Lss ExpUnit", "$$ = $1; $1.push($2)"],
			["Lss ( Exp )", "$$ = $1; $1.push($3)"]
		],
*/
		"ExpEx": [
			["Exp", "$$ = ['_normalcall', $1]"]
//			["@ Exp", "$$ = ['_precall', $2]"]
		],
		"ExpList": [
			["ExpEx",  "$$ = [$1];"],  //artical
			["; ExpEx",  "$$ = [$2];"],
			["ExpList ; ExpEx", "$$ = $1; $1.push($3);"],
			["ExpList ;", "$$ = $1;"],
			[";", "$$ = [];"]
		],
		"Exp": [//sentence
			["( Exp )", "$$ = $2"],
			["[ ]", "$$ = ['_array', []]"],
			["Lss", "if($1.length == 1) $$ = $1[0]; else $$ = ['_newcall', $1]"],
			["ExpUnit", "$$ = $1"],
			["Op", "$$ = $1"]
		],
		"Op": [
			["! Exp", "$$ = ['_newcall', [['_id', 'not'], $2]]"],
			["Exp = Exp", "$$ = ['_newcall', [['_id', 'assign'], $3, $1]]"],
			["Exp + Exp", "$$ = ['_newcall', [['_id', 'add'], $1, $3]]"],
			["Exp - Exp", "$$ = ['_newcall', [['_id', 'minus'], $1, $3]]"],
			["Exp * Exp", "$$ = ['_newcall', [['_id', 'times'], $1, $3]]"],
			["Exp / Exp", "$$ = ['_newcall', [['_id', 'obelus'], $1, $3]]"],
			["Exp += Exp", "$$ = ['_newcall', [['_id', 'assign'], ['_newcall', [['_id', 'add'], $1, $3]], $1]]"],
			["Exp >= Exp", "$$ = ['_newcall', [['_id', 'ge'], $1, $3]]"],
			["Exp <= Exp", "$$ = ['_newcall', [['_id', 'le'], $1, $3]]"],
			["Exp == Exp", "$$ = ['_newcall', [['_id', 'eq'], $1, $3]]"],
			["Exp != Exp", "$$ = ['_newcall', [['_id', 'ne'], $1, $3]]"],
			["Exp > Exp", "$$ = ['_newcall', [['_id', 'gt'], $1, $3]]"],
			["Exp < Exp", "$$ = ['_newcall', [['_id', 'lt'], $1, $3]]"],
			["ID := Exp", "$$ = ['_newcall', [['_id', 'setp'], $3, ['_local', $1]]]"],
			["GetOp", "$$ = $1"]
		],
		"ExpUnit": [
			["[ Array ]", "$$ = ['_array', $2]"],
			[": Brace", "$$ = ['_block', $2, 'Function']"],
			[": ( IdstrArray ) Brace", "$$ = ['_block', $5, 'Function', $3]"],
			[": ID Brace", "$$ = ['_block', $3, $2]"],
			["Brace", "$$ = ['_block', $1]"],
			[": Native", "$$ = ['_precall', $2]"],
			["Native", "$$ = $1"]
		],
		"Brace": [
			["{ ExpList }", "$$ = $2"],
			["{ }", "$$ = []"]
		],
		"Precall": [
			["[ ExpList ]", "$$ = ['_precall', $2]"],
			["[ ]", "$$ = ['_precall', []]"]
		],
 		"Array": [
			["Exp", "$$ = [$1]"],
			["Array , Exp", "$$ = $1, $1.push($3)"]
		],
 		"IdstrArray": [
			["ID", "$$ = [$1]"],
			["IdstrArray , ID", "$$ = $1, $1.push($3)"]
		]
  }
};
var options = {};
var code = new jison.Generator(grammar, options).generate();
fs.writeFileSync(__dirname + '/parser.js', code);

