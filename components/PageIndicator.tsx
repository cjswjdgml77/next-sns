type Props = {
  text: string;
};

const PageIndicator = ({ text }: Props) => {
  return <div className="text-2xl px-4 py-6 font-['Fraunces']">{text}</div>;
};

export default PageIndicator;
