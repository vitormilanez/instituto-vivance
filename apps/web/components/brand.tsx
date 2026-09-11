import Image from "next/image";
export function Brand() {
  return (
    <div className="brand">
      <Image
        className="brand-mark"
        src="/brand/vivance-mark.png"
        alt=""
        width={42}
        height={42}
        priority
      />
      <div>
        <strong>VIVANCE</strong>
        <small>Cuidado contínuo</small>
      </div>
    </div>
  );
}
