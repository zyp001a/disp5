`
var fcpt = $[0];
var str = ""
for(var varname in ns.global.ref){
  str += "var "+ varname +";\n";
}
for(var i in fcpt.block){
 var v = fcpt.block[i].repr;
 if(v)
  str += v + ";\n";
 else
  str += "//\n"
}
if(!fcpt._main)
 str = "function(args){\n"+str+"}"
return str;
`
