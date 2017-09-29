`
if($$[1] == "local")
 return gc(ns, $$[0])
else if($$[1] == "notlocal")
 return gc(ns, $$[0], {excludelocal:1, notlocal:1})
else
 return gc(ns, $$[0], {notlocal:1})
`
