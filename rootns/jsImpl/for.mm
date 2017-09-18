`
var res;
var hash = _getref($[1])
for(var key in hash.ref){
 $[0].value = raw2cpt(ns, key);
 res = doexec($[2], ns)
 if(res.value.name == "break"){
  break;
 }
}
return res;
`
