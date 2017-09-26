:(x){
 @r = ""
 @flag = 0
 forstr @a x {
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
