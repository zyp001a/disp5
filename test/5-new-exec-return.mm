a = new Proto {};
with a {
 b = 1
 exec {c=1}
}
vardump a
x = :{
 return $0
 1
}
print (x 2)
