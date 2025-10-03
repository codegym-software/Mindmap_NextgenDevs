export const addBtnStyle = (side) => ({
    position:'absolute',
    [side]:'-8px',
    top:'50%',
    transform:'translateY(-50%)',
    width:'20px',
    height:'20px',
    borderRadius:'50%',
    background:'#667eea',
    border:'2px solid white',
    color:'white',
    fontSize:'12px',
    cursor:'pointer',
    display:'flex',
    alignItems:'center',
    justifyContent:'center',
    boxShadow:'0 2px 8px rgba(0,0,0,0.2)'
});

export const deleteBtnStyle = {
    position:'absolute',
    top:'-8px',
    right:'-8px',
    width:'20px',
    height:'20px',
    borderRadius:'50%',
    background:'#ef4444',
    border:'2px solid white',
    color:'white',
    fontSize:'13px',
    lineHeight:1,
    cursor:'pointer',
    display:'flex',
    alignItems:'center',
    justifyContent:'center',
    boxShadow:'0 2px 8px rgba(0,0,0,0.2)'
};

export const miniBtnStyle = (c1, c2) => ({
    background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
});