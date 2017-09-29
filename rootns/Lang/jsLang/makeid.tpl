^^
if(args.1 == "local"){
$$
^^=(args.0)$$^^
}(args.1 == "notlocal"){
die("@! is not used for generation")
}{
  if(args.0 == "args"){
    if((from env).args.ismain){
$$
args^^
    }{
$$
arguments^^
    }
$$
^^
  }{
$$
_g_.^^=(args.0)$$^^
  }
}$$