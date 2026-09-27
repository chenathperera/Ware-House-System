import EmployeeForm from "../../_components/EmployeeForm.jsx";
export default async function EditEmployeePage({ params }) { const { id } = await params; return <EmployeeForm id={id} />; }
