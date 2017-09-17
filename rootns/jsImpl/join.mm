`
var str= "";
var sep = $$[1];
for(var i in $$[0]){
 str += _getref($$[0][i]).value
 if(i != $$[0].length - 1){
  str += sep
 }
}
return str
`
