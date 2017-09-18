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
      ["{sp}\\\\[\\r\\n;]+{sp}", "return"],
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
			["{sp}\\>\\={sp2}", "return '>='"],
			["{sp}\\<\\={sp2}", "return '<='"],
			["{sp}\\=\\={sp2}", "return '=='"],
			["{sp}\\|\\|{sp2}", "return '||'"],
			["{sp}\\&\\&{sp2}", "return '&&'"],
			["{sp}\\:\\:{sp2}", "return '::'"],
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
    ["right", "=", "+=", "-=", "*=", "/="],
		["left", "=?", "=:", "=>", "->"],
		["left", "<", ">", ">=", "<=", "=="],
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
		"L": [//word
			["ID", "$$ = ['_id', $1]"],
			["STRING", "$$ = ['_string', $1]"],
			["NUMBER", "$$ = ['_number', Number($1)]"],
			["& ( Exp )", "$$ = ['_getid', $3]"],
			["& L", "$$ = ['_getid', $2]"]
		],
		"Lss": [
			["L", "$$ = [$1]"], //newcall
			["Lss L", "$$ = $1; $1.push($2)"],
			["Lss ExpUnit", "$$ = $1; $1.push($2)"],
			["Lss ( Exp )", "$$ = $1; $1.push($3)"]
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
			["@ Exp", "$$ = ['_precall', $2]"],
			["( Exp )", "$$ = $2"],
			["[ Array ]", "$$ = ['_array', $2]"],
			["[ ]", "$$ = ['_array', []]"],
			["Lss", "if($1.length == 1) $$ = $1[0]; else $$ = ['_newcall', $1]"],
			["ExpUnit", "$$ = $1"],
			["Op", "$$ = $1"],
			["Native", "$$ = $1"]
		],
		"GetOp": [
			["Exp . ID", "$$ = ['_op', 'get', $1, ['_internal', $3]]"],
			["Exp . STRING", "$$ = ['_op', 'get', $1, ['_internal', $3]]"],
			["Exp . NUMBER", "$$ = ['_op', 'get', $1, ['_internal', $3]]"],
			["Exp . ( Exp )", "$$ = ['_op', 'get', $1, $4]"]
		],
		"Op": [
			["! Exp", "$$ = ['_op', 'not', $2]"],
			["Exp = Exp", "$$ = ['_op', 'assign', $1, $3]"],
//			["Exp : Exp", "$$ = ['_op', 'preassign', $1, $3]"],
			["Exp + Exp", "$$ = ['_op', 'plus', $1, $3]"],
			["Exp - Exp", "$$ = ['_op', 'minus', $1, $3]"],
			["Exp < Exp", "$$ = ['_op', 'lt', $1, $3]"],
			["Exp > Exp", "$$ = ['_op', 'gt', $1, $3]"],
			["Exp <= Exp", "$$ = ['_op', 'le', $1, $3]"],
			["Exp >= Exp", "$$ = ['_op', 'ge', $1, $3]"],
			["Exp == Exp", "$$ = ['_op', 'eq', $1, $3]"],
			["GetOp", "$$ = $1"]
//			["Exp =~ Exp", "$$ = ['_op', 'match', $1, $3]"]
//			["Exp =? Exp", "$$ = ['_op', 'default', $1, $3]"],
//			["Exp =: Exp", "$$ = ['_op', 'proto', $1, $3]"],
//			["Exp => Exp", "$$ = ['_op', 'parent', $1, $3]"],
//			["Exp -> Exp", "$$ = ['_op', 'link', $1, $3]"]
		],
		"ExpUnit": [
			[": Brace", "$$ = ['_block', $2, 'Function']"],
			[": IdArray Brace", "$$ = ['_block', $3, 'Function', $2]"],
			["^ ID Brace", "$$ = ['_block', $3, $2]"],
			["Brace", "$$ = ['_block', $1]"]
//			[": ID Braket", "$$ = ['_newcpt', $3, 'Function', $2]"],
//			["^ Braket", "$$ = ['_newcpt', $2, 'Cpt']"],
//			["^ : ID Braket", "$$ = ['_newcpt', $4, 'Cpt', $3]"],
//			["^ ID : ID Braket", "$$ = ['_newcpt', $5, $2, $4]"]
		],
/*
		"Braket": [
			["[ ExpList ]", "$$ = $2"],
			["[ ]", "$$ = []"]
		],
*/
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
 		"IdArray": [
			["ID", "$$ = [$1]"],
			["IdArray , ID", "$$ = $1, $1.push($3)"]
		]
  }
};
var options = {};
var code = new jison.Generator(grammar, options).generate();
fs.writeFileSync(__dirname + '/parser.js', code);

