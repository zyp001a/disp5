`
var fcpt = $[0];
var str = ""
for(var varname in ns.ref){
  if(varname == "func" || varname == "args") continue;
  str += "var "+ varname +";\n";
}
for(var i in fcpt.block){
 if(! ("repr" in fcpt.block[i]))
  docall(fcpt.block[i], self, 1)
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
