`
var res;
var hash = _getref($[1])
if(!hash) return;
for(var key in hash.ref){
 $[0].value = raw2cpt(key);
 res = doexec($[2], ns)
 if(isproto(res, "Break")){
  break;
 }
}
return res;
`
