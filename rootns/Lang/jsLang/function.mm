`
var res = docall(newcall($[0]), self.from);
var str = ""
for(var varname in $[0].ref){
 if(varname != "self")
  str += "var "+ varname +";\n";
}
for(var i in res.cpt){
 str += res.cpt[i].value + ";\n";
}
return str;
`
