{
 pre := :{
  setLink global nodejsLang
 }
 tree := :{
	mount."main.js" = trans ^"main.js" userns
 }
}
