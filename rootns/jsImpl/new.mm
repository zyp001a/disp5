`
var cpt = newcpt(self.from, $[0]); 
doexec($[0], cpt); 
setproto(cpt, gc(self.from, "Block", {limit:2, initref: 1})); 
cpt.block = $[1].block; 
return cpt;
`
