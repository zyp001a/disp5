`
var str= "";
var sep = $$[1];
var arr = _getref($[0])
for(var i=0; i<arr._length; i++){
 var x = _getref(arr.ref[i])
 var v;
 if(!x){
  v= ""
 }else{
  v=x.repr
 }
 str += v
 if(i != arr._length - 1){
  str += sep
 }
}
return str
`
