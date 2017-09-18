`
var res;
for(var i in $$[1]){
 $[0].value = $$[1][i];
 res = doexec($[2], ns)
 if(res.value.name == "break"){
  break;
 }
}
return res;
`
