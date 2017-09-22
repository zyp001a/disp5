{
 pre := :{
  setLink global expressjsLang
 }
 tree := :{
	mount."main.js" = trans ^"main.js" userns
 }
}
