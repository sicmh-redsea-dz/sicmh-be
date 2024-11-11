export interface VisitsResponse {
    id           : number;
    diagnosis    : string;
    doctorName   : string;
    patientName  : string;
    lastVisitDate: string;
}

export interface VisitResponse {
    id                  : number,
    BMI                 : number,
    date                : string,
    notes               : string,
    height              : number,
    weight              : number,
    doctor              : number,
    patient             : number,
    pressure            : string,
    diagnosis           : string,
    treatment           : string,
    glucometry          : number,
    temperature         : number,
    oxygenation         : number,
    visceralFat         : number,
    fatPercentage       : number,
    ageAccordingToWeight: number,
}

export interface FormVisit{
    BMI                 :string,
    date                :string,
    notes               :string,
    height              :string,
    weight              :string,
    doctor              :string,
    patient             :string,
    pressure            :string,
    diagnosis           :string,
    treatment           :string,
    glucometry          :string,
    temperature         :string,
    oxygenation         :string,
    visceralFat         :string,
    fatPercentage       :string,
    ageAccordingToWeight:string,
}