`
var fcpt = $[0];
var res = docall(newcall(fcpt), global);
var str = ""
for(var varname in fcpt.ref){
 if(varname != "self")
  str += "var "+ varname +";\n";
}
for(var i in res.cpt){
 var v = res.cpt[i].value;
 if(v)
  str += v + ";\n";
 else
  str += "//\n"
}
if(!fcpt._main)
 str = "function(args){\n"+str+"}"
return str;
`
