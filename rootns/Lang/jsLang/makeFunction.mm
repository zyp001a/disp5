`
var fcpt = $[0];
var str = ""
var indent = "";
var i = 0;
while(i < fcpt._indent){
 i+=1;
 indent += "  ";
}
for(var varname in fcpt.ref){
  if(varname == "func" || varname == "args") continue;
  str += indent + "var "+ varname +";\n";
}

for(var i in fcpt.block){
 if(! ("repr" in fcpt.block[i]))
  docall(fcpt.block[i], self, 1)
 var v = fcpt.block[i].repr;
 str += indent;
 if(v)
  str += v + ";\n";
 else
  str += "//\n"
}
var argsDef = "";
if(fcpt._argsdef){
 argsDef = fcpt._argsdef.join(", ")
}
if(fcpt._main){

}else if(fcpt._name){
 str = "function " + fcpt._name+ "(" + argsDef + "){\n"+str+"}"
}else{
 str = "function(" + argsDef + "){\n"+str+"}"
}

return str;
`
