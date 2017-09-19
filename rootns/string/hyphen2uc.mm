:{
 r = ""
 flag = 0
 forarr a $0 {
  if (a == '-') {
   flag = 1
  }{
   if(!flag){
    r += a;
   }{
    r += (uc a)
   }
  }
 }
 return r
}
