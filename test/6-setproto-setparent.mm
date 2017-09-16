setp B {}
setp A {
 proto Number
 parent B
 setp x 1
 setp init 2
}
a = {
 proto Number
}
setLink A B
vardump A
vardump a
