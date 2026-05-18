import "../styles/boton.css";
function Boton({text, w, h,dis}) {
  return (
    dis ? (
      <button style={{width: w, height: h}} disabled className="btn disabled">
        {text}
      </button>
    ) : (
      <button style={{width: w, height: h}} className="btn">
        {text}
      </button>
    )
    
  )
}

export default Boton