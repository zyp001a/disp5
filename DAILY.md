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
 Value +value => js Object
  String
  Number
  Hash
  ValueArray
 Native +native
 Ref +ref
 Ns =>do setparent
  Array
  Function +function
   FunctionNative
 Shadow
 Call +call

Generate process:
 prepare code tree Cpt -> main -> all related -> ... -> map to folder

Archive guide:
 cpt with step


modify arguments
modify assign