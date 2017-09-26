`
var argarr = []
if($[1]){
 var ref = _getref($[1]).ref;
 for(var i in ref){
  argarr[i] = ref[i].value;
 }
}
return docall(newcall($[0], argarr), self, pseudo)
`
