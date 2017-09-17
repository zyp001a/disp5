`
var fcpt = $[0];
var res = docall(newcall(fcpt), self.from);
var str = ""
for(var varname in fcpt.ref){
 if(varname != "self")
  str += "var "+ varname +";\n";
}
for(var i in res.cpt){
 str += res.cpt[i].value + ";\n";
}
if(!fcpt._main)
 str = "function(args){\n"+str+"}"
return str;
`
