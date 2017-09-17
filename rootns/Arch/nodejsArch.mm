{
 setp init :{
  setLink userns nodejsLang
 }
 setp tree :{
	mount."main.js" = trans &"main.js" userns
 }
}
