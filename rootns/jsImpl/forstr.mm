`
var res;
for(var i in $$[1]){
 $[0].value = raw2cpt(ns, $$[1][i]);
 res = doexec($[2], ns)
 if(isproto(res, "Break")){
  break;
 }
}
return res;
`
