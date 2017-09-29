B1;3409;0c# 8.21 
* split concept tree into storage tree, main tree and index tree
* make Ref object and add methods like getvalue
* generate code scratch
 iterate index tree -> gen dependencies and predefine objects
 iterate main tree -> gen main code

# 8.22
* Program structure
 load rootns
 load [user]
 append $main
 append $main.env
有序信息
轻网
小语言
世界观

# 8.25
leaf define -> persistency

# 8.26
shadow system

# 8.27
two derive method: shadow and imprint

# 8.29
Obj
if not exsit: new
else
 Ns: all new
 Sd: no new


get
set

Steps:
Create .create.mm
Analyze .analyze.mm
Execute

# 8.31
Obj vs Ns
Obj is Ns

# 9.1
implement ns system
add blood to support it

change assign mechanism
add step

when assign Ref, assign its value address
so Ref should have value space
arguments should be in function //no

# 9.2
The Tree:

Cpt
 Proto
 Hash
 Array
 Value +value => js Object
  String
  Number
  Call +call
  Return
 Native +native
 Ref +ref
 Ns =>do setparent
  Array
  Function +function
   FunctionNative
 Shadow

Generate process:
 prepare code tree Cpt -> main -> all related -> ... -> map to folder

Archive guide:
 cpt with step


modify arguments
modify assign

done 1step

gen:
Tree
Program 

# 9.3
when create obj, call
Hash
another callfunc

^ define
: name


arch: 
1. each function -> convert to langfunction
2. fs parts 
-> 
requirements
connected
main

lang
connector
interlang

# 9.7
get writable and get readable is different
4level
Ref:
blood read all/write blood
parent read all/write new
link read all/write all pass once*/*

blood is perfect proto
Ns is used only for archive

Part
gc: read?write? part?

# 9.13
namespace guide
rootns
 userns

 $Env0 

newcall func args
docallFunction call env
 newenv from env
 arguments set in newenv
docallBlock call env 
 no newenv

block: call at defined env;
function: call at new env;
natives are functions

a = new Server {
 port = 80
}


# 9.20
dual env
dual analyze
-> dual call

# 9.22
keywords:
arguments $
local/var @
getrepr &
id ^
precall :
class :
function :

# 9.27
Almost done, except for class-object. I need to think twice;
Begin common sense project.