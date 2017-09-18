`
var tmpi = $.length - 2
var res;
i = 0
if($$[0]){
 res = doexec($[1], ns)
}else{
 while(tmpi > 1){
  tmpi -=2
  i += 2
  if($$[i]){
   res = doexec($[i+1], ns)
  }
 }
 if(tmpi == 1){
  res = doexec($[i+2], ns)
 }
}
return res;
`
