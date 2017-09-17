`
var str= "";
var sep = $$[1];
for(var i in $$[0]){
 var x = _getref($$[0][i])
 if(!x){
  continue;
 }
 str += x.value
 if(x.value != "" && i != $$[0].length - 1){
  str += sep
 }
}
return str
`
