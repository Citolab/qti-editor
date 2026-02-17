const xml = String.raw;

const qtiAssessmentItem = ({
  qtiItemBody,
  identifier,
  title
}: {
  qtiItemBody: string;
  identifier: string;
  title: string;
}) => xml`
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 
https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd" identifier="${identifier}"
title="${title}" adaptive="false" time-dependent="false" xml:lang="en">

  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"/>
  
  <qti-item-body>
    ${qtiItemBody}
  </qti-item-body>

</qti-assessment-item>
`;

const qtiResponseDeclarationTemplate = ({
  identifier,
  cardinality,
  baseType,
  value
}: {
  identifier: string;
  cardinality: string;
  baseType: string;
  value: string;
}) => xml`
  <qti-response-declaration identifier="${identifier}" cardinality="${cardinality}" base-type="${baseType}">
    <qti-correct-response>
      <qti-value>${value}</qti-value>
    </qti-correct-response>
  </qti-response-declaration>`;

const qtiResponseProcessingTemplate = ({ template }: { template: string }) => xml`
  <qti-response-processing template="${template}"/>
`;
