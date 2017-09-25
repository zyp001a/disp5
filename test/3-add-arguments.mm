b = :(x,y){print x;print y;print args.0}
a = :(x){x.1=1}
c = {}
a c;
print c.1
b 1
